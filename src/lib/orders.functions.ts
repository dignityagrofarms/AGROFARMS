import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Normalize Nigerian phone numbers to a comparable digits-only form.
// "07083476366", "+2347083476366", "234 708 347 6366" all become "2347083476366".
function normalizePhone(input: string): string {
  const digits = input.replace(/\D+/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0") && digits.length >= 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return digits;
}

function makeOrderCode(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `DAF-${n}`;
}

// The order code doubles as the tracking code and the receipt number, so a
// customer only ever has one simple code to remember (e.g. DAF-12345).

export const MIN_ORDER_SUBTOTAL = 5000;

// Codes are used inside PostgREST .or() filters, so keep them to safe chars.
function safeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

const itemSchema = z.object({
  product: z.string().min(1).max(200),
  option: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(500),
  unitPrice: z.number().int().min(0),
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(3).max(300),
  deliveryZone: z.enum(["owerri", "outside"]),
  items: z.array(itemSchema).min(1).max(20),
  subtotal: z.number().int().min(MIN_ORDER_SUBTOTAL, {
    message: `Minimum order is ${"\u20a6"}5,000. Please add a little more to your order.`,
  }),
  deliveryFee: z.number().int().min(0),
  total: z.number().int().min(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  voucherCode: z.string().trim().max(40).optional().nullable(),
});

const normalizeVoucherCode = (input: string) => input.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

type VoucherRow = {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
};

function calculateVoucherDiscount(voucher: VoucherRow, subtotal: number): number {
  if (voucher.discount_type === "percent") return Math.min(subtotal, Math.floor((subtotal * voucher.discount_value) / 100));
  return Math.min(subtotal, voucher.discount_value);
}

function voucherIsUsable(voucher: VoucherRow): boolean {
  return voucher.active &&
    (!voucher.expires_at || new Date(voucher.expires_at).getTime() >= Date.now()) &&
    (voucher.max_uses === null || voucher.uses_count < voucher.max_uses);
}

async function findUsableVoucher(code: string): Promise<VoucherRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("discount_vouchers")
    .select("code, discount_type, discount_value, expires_at, max_uses, uses_count, active")
    .eq("code", normalizeVoucherCode(code))
    .maybeSingle();
  if (error) throw new Error("Could not validate that voucher right now.");
  if (!data || !voucherIsUsable(data as VoucherRow)) return null;
  return data as VoucherRow;
}

const voucherCheckSchema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.number().int().min(0),
});

export const validateVoucher = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => voucherCheckSchema.parse(data))
  .handler(async ({ data }) => {
    const code = normalizeVoucherCode(data.code);
    const voucher = await findUsableVoucher(code);
    if (!voucher) return { valid: false as const, code, discountAmount: 0, message: "That voucher is invalid, expired, inactive, or fully used." };
    const discountAmount = calculateVoucherDiscount(voucher, data.subtotal);
    return {
      valid: true as const,
      code: voucher.code,
      discountAmount,
      discountType: voucher.discount_type,
      discountValue: voucher.discount_value,
      message: voucher.discount_type === "percent"
        ? `${voucher.discount_value}% discount applied.`
        : `Discount of ${"\u20a6"}${voucher.discount_value.toLocaleString("en-NG")} applied.`,
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    let discountAmount = 0;
    let voucherCode: string | null = null;
    if (data.voucherCode?.trim()) {
      const voucher = await findUsableVoucher(data.voucherCode);
      if (!voucher) throw new Error("That voucher is invalid, expired, inactive, or fully used.");
      discountAmount = calculateVoucherDiscount(voucher, data.subtotal);
      voucherCode = voucher.code;
    }
    const finalTotal = data.subtotal + data.deliveryFee - discountAmount;

    // Retry a few times on the unlikely event of an order_code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderCode = makeOrderCode();
      const trackCode = orderCode;
      const { data: row, error } = await supabaseAdmin
        .from("orders")
        .insert({
          order_code: orderCode,
          track_code: trackCode,
          customer_name: data.customerName,
          phone,
          address: data.address,
          delivery_zone: data.deliveryZone,
          items: data.items,
          subtotal: data.subtotal,
          delivery_fee: data.deliveryFee,
          total: finalTotal,
          discount_amount: discountAmount,
          voucher_code: voucherCode,
          notes: data.notes ?? null,
          status: "received",
        })
         .select("order_code, track_code")
        .single();

      if (!error && row) {
        if (voucherCode) {
          const { data: voucher } = await supabaseAdmin
            .from("discount_vouchers")
            .select("uses_count")
            .eq("code", voucherCode)
            .maybeSingle();
          if (voucher) {
            await supabaseAdmin.from("discount_vouchers").update({ uses_count: voucher.uses_count + 1 }).eq("code", voucherCode);
          }
        }
        return { orderCode: row.order_code, trackCode: row.track_code as string, total: finalTotal, discountAmount };
      }
      if (error && !/duplicate key|unique/i.test(error.message)) {
        console.error("createOrder failed", error);
        throw new Error("Could not save your order. Please try again.");
      }
    }
    throw new Error("Could not generate an order code. Please try again.");
  });

const trackSchema = z.object({
  trackCode: z.string().trim().min(4).max(20),
});

export type TrackedOrder = {
  orderCode: string;
  trackCode: string;
  status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  statusNote: string | null;
  eta: string | null;
  items: { product: string; option: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryZone: string;
  createdAt: string;
  updatedAt: string;
  paymentStatus: "pending" | "submitted" | "approved" | "rejected";
  paymentRejectionReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
};

export const trackByCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackSchema.parse(data))
  .handler(async ({ data }): Promise<{ orders: TrackedOrder[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = safeCode(data.trackCode);

    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("order_code, track_code, status, status_note, eta, items, subtotal, delivery_fee, total, delivery_zone, created_at, updated_at, payment_status, payment_rejection_reason, cancelled_at, cancelled_by, cancel_reason")
      .or(`track_code.eq.${code},order_code.eq.${code}`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("trackByCode failed", error);
      throw new Error("Could not look up that order. Please try again.");
    }

    return {
      orders: (rows ?? []).map((r) => ({
        orderCode: r.order_code,
        trackCode: (r as { track_code: string | null }).track_code ?? "",
        status: r.status as TrackedOrder["status"],
        statusNote: r.status_note,
        eta: r.eta,
        items: (r.items as TrackedOrder["items"]) ?? [],
        subtotal: r.subtotal,
        deliveryFee: r.delivery_fee,
        total: r.total,
        deliveryZone: r.delivery_zone,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        paymentStatus: (r as { payment_status: TrackedOrder["paymentStatus"] }).payment_status,
        paymentRejectionReason: (r as { payment_rejection_reason: string | null }).payment_rejection_reason,
        cancelledAt: r.cancelled_at,
        cancelledBy: r.cancelled_by,
        cancelReason: r.cancel_reason,
      })),
    };
  });

// ---------- Customer cancellation ----------

// Lost your code? Look it up with the phone number used on the order.
export const recoverCodesByPhone = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ phone: z.string().trim().min(7).max(30) }).parse(data))
  .handler(async ({ data }): Promise<{ codes: { code: string; status: string; createdAt: string; total: number }[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("order_code, status, created_at, total")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error("Could not look that up. Please try again.");
    return {
      codes: (rows ?? []).map((r) => ({
        code: r.order_code,
        status: r.status as string,
        createdAt: r.created_at,
        total: r.total,
      })),
    };
  });

const cancelSchema = z.object({
  trackCode: z.string().trim().min(4).max(20),
  reason: z.string().trim().min(1).max(300),
});

export const cancelOrderByCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cancelSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: "customer",
        cancel_reason: data.reason,
        status_note: `Cancelled by customer: ${data.reason}`,
      })
      .or(`track_code.eq.${safeCode(data.trackCode)},order_code.eq.${safeCode(data.trackCode)}`)
      .in("status", ["received", "preparing"])
      .in("payment_status", ["pending", "submitted", "rejected"])
      .select("order_code")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("This order can no longer be cancelled online. Please call 070 8347 6366.");
    return { ok: true };
  });

// ---------- Admin ----------

export type AdminRole = "owner" | "staff";

type AdminCredential = { username: string; passcode: string };

function parseAdminCredential(value: string): AdminCredential {
  try {
    const parsed = JSON.parse(value) as Partial<AdminCredential>;
    if (typeof parsed.username === "string" && typeof parsed.passcode === "string") {
      return { username: parsed.username.trim().toLowerCase(), passcode: parsed.passcode };
    }
  } catch {
    // Older browser sessions stored only the passcode. Treat those as owner
    // recovery credentials so existing admins are not locked out.
  }
  return { username: "owner", passcode: value };
}

async function hashPasscode(passcode: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passcode));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Owner and staff use separate credentials. The permanent ADMIN_PASSCODE is
// the owner recovery credential; the saved app setting is the staff credential.
async function checkPasscode(value: string): Promise<AdminRole> {
  if (!value) throw new Error("Invalid login details.");
  const credential = parseAdminCredential(value);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: configured } = await supabaseAdmin
    .from("admin_access")
    .select("username, role, passcode_hash, active")
    .eq("username", credential.username)
    .maybeSingle();
  if (configured?.active && configured.passcode_hash && (await hashPasscode(credential.passcode)) === configured.passcode_hash) {
    return configured.role as AdminRole;
  }

  const master = process.env.ADMIN_PASSCODE;
  const masterUsername = process.env.ADMIN_USERNAME;
  if (masterUsername && credential.username === masterUsername && master && credential.passcode === master) return "owner";

  const { data: staffSetting } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "admin_passcode")
    .maybeSingle();
  if (credential.username === "staff" && staffSetting?.value && credential.passcode === staffSetting.value) return "staff";
  throw new Error("Invalid login details.");
}

async function checkOwner(value: string) {
  const role = await checkPasscode(value);
  if (role !== "owner") throw new Error("Owner access is required for this action.");
  return role;
}

// Lets a signed-in admin see the passcode currently in use and change it.
export const adminGetPasscode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }): Promise<{ current: string; isMaster: boolean }> => {
    const role = await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "admin_passcode")
      .maybeSingle();
    return { current: row?.value ?? "", isMaster: role === "owner" };
  });

export const adminSetPasscode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string().min(1).max(200),
      newPasscode: z.string().trim().min(6).max(60),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "admin_passcode", value: data.newPasscode, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const adminListSchema = z.object({
  passcode: z.string().min(1).max(200),
  from: z.string().trim().max(40).optional().nullable(),
  to: z.string().trim().max(40).optional().nullable(),
  status: z.string().trim().max(40).optional().nullable(),
  paymentStatus: z.string().trim().max(40).optional().nullable(),
  zone: z.string().trim().max(40).optional().nullable(),
  search: z.string().trim().max(120).optional().nullable(),
  view: z.enum(["cancelled_customer", "cancelled_admin", "not_completed"]).optional().nullable(),
});

export type AdminOrder = TrackedOrder & {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  notes: string | null;
  paymentSubmittedAt: string | null;
  paymentApprovedAt: string | null;
  discountAmount: number;
  voucherCode: string | null;
};

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminListSchema.parse(data))
  .handler(async ({ data }): Promise<{ orders: AdminOrder[]; role: AdminRole }> => {
    const role = await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("orders").select("*");
    if (data.from) q = q.gte("created_at", new Date(data.from + "T00:00:00").toISOString());
    if (data.to) q = q.lte("created_at", new Date(data.to + "T23:59:59.999").toISOString());
    if (data.status) q = q.eq("status", data.status as AdminOrder["status"]);
    if (data.paymentStatus) q = q.eq("payment_status", data.paymentStatus as AdminOrder["paymentStatus"]);
    if (data.zone) q = q.eq("delivery_zone", data.zone);
    if (data.view === "cancelled_customer") q = q.eq("status", "cancelled").eq("cancelled_by", "customer");
    if (data.view === "cancelled_admin") q = q.eq("status", "cancelled").neq("cancelled_by", "customer");
    if (data.view === "not_completed") {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      q = q
        .in("payment_status", ["pending", "rejected"])
        .not("status", "in", "(cancelled,delivered)")
        .lt("updated_at", cutoff);
    }
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ").trim();
      const phoneDigits = normalizePhone(s);
      q = q.or(
        `order_code.ilike.%${s}%,track_code.ilike.%${s}%,customer_name.ilike.%${s}%,phone.ilike.%${phoneDigits}%`,
      );
    }
    const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return {
      orders: (rows ?? []).map((r) => ({
        id: r.id,
        orderCode: r.order_code,
        trackCode: (r as { track_code: string | null }).track_code ?? "",
        customerName: r.customer_name,
        phone: r.phone,
        address: r.address,
        notes: r.notes,
        status: r.status as AdminOrder["status"],
        statusNote: r.status_note,
        eta: r.eta,
        items: (r.items as AdminOrder["items"]) ?? [],
        subtotal: r.subtotal,
        deliveryFee: r.delivery_fee,
        total: r.total,
        deliveryZone: r.delivery_zone,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        paymentStatus: r.payment_status as AdminOrder["paymentStatus"],
        paymentRejectionReason: r.payment_rejection_reason,
        paymentSubmittedAt: r.payment_submitted_at,
        paymentApprovedAt: r.payment_approved_at,
        discountAmount: r.discount_amount ?? 0,
        voucherCode: r.voucher_code,
        cancelledAt: r.cancelled_at,
        cancelledBy: r.cancelled_by,
        cancelReason: r.cancel_reason,
      })),
      role,
    };
  });

const adminUpdateSchema = z.object({
  passcode: z.string().min(1).max(200),
  id: z.string().uuid(),
  status: z.enum(["received", "preparing", "out_for_delivery", "delivered", "cancelled"]),
  statusNote: z.string().trim().max(500).optional().nullable(),
  eta: z.string().trim().max(200).optional().nullable(),
});

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: data.status,
        status_note: data.statusNote ?? null,
        eta: data.eta ?? null,
        ...(data.status === "cancelled"
          ? { cancelled_at: new Date().toISOString(), cancelled_by: "admin", cancel_reason: data.statusNote ?? null }
          : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const adminCorrectionSchema = z.object({
  passcode: z.string().min(1).max(500),
  id: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(3).max(300),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const adminCorrectOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminCorrectionSchema.parse(data))
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({
      customer_name: data.customerName,
      phone: normalizePhone(data.phone),
      address: data.address,
      notes: data.notes ?? null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const adminDeleteSchema = z.object({ passcode: z.string().min(1).max(500), id: z.string().uuid() });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminDeleteSchema.parse(data))
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Client CRM ----------

export type ClientOrderSummary = {
  orderCode: string;
  createdAt: string;
  total: number;
  paymentStatus: AdminOrder["paymentStatus"];
  status: AdminOrder["status"];
  discountAmount: number;
  voucherCode: string | null;
};

export type ClientRecord = {
  key: string;
  customerName: string;
  phone: string;
  address: string;
  totalOrders: number;
  approvedOrders: number;
  amountPaid: number;
  amountOrdered: number;
  lastOrderAt: string;
  lastOrderCode: string;
  lastStatus: AdminOrder["status"];
  orders: ClientOrderSummary[];
};

const adminClientsSchema = z.object({
  passcode: z.string().min(1).max(200),
  search: z.string().trim().max(120).optional().nullable(),
});

export const adminListClients = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminClientsSchema.parse(data))
  .handler(async ({ data }): Promise<{ clients: ClientRecord[] }> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("customer_name, phone, address, order_code, created_at, total, payment_status, status, discount_amount, voucher_code")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const grouped = new Map<string, ClientRecord>();
    for (const row of rows ?? []) {
      const phone = row.phone;
      const key = phone || row.customer_name.trim().toLowerCase();
      const existing = grouped.get(key);
      const order: ClientOrderSummary = {
        orderCode: row.order_code,
        createdAt: row.created_at,
        total: row.total,
        paymentStatus: row.payment_status as AdminOrder["paymentStatus"],
        status: row.status as AdminOrder["status"],
        discountAmount: row.discount_amount ?? 0,
        voucherCode: row.voucher_code,
      };
      if (existing) {
        existing.totalOrders += 1;
        existing.approvedOrders += row.payment_status === "approved" ? 1 : 0;
        existing.amountPaid += row.payment_status === "approved" ? row.total : 0;
        existing.amountOrdered += row.total;
        existing.orders.push(order);
      } else {
        grouped.set(key, {
          key,
          customerName: row.customer_name,
          phone,
          address: row.address,
          totalOrders: 1,
          approvedOrders: row.payment_status === "approved" ? 1 : 0,
          amountPaid: row.payment_status === "approved" ? row.total : 0,
          amountOrdered: row.total,
          lastOrderAt: row.created_at,
          lastOrderCode: row.order_code,
          lastStatus: row.status as AdminOrder["status"],
          orders: [order],
        });
      }
    }

    const search = data.search?.trim().toLowerCase();
    const clients = Array.from(grouped.values()).filter((client) => !search ||
      client.customerName.toLowerCase().includes(search) ||
      client.phone.includes(search) ||
      client.address.toLowerCase().includes(search));
    return { clients };
  });

// ---------- Discount vouchers ----------

export type AdminVoucher = {
  id: string;
  code: string;
  displayName: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  recipientName: string | null;
  recipientPhone: string | null;
  note: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  active: boolean;
  createdAt: string;
};

const adminVoucherBase = z.object({ passcode: z.string().min(1).max(200) });

function mapVoucher(row: Record<string, unknown>): AdminVoucher {
  return {
    id: String(row.id),
    code: String(row.code),
    displayName: row.display_name as string | null,
    discountType: row.discount_type as AdminVoucher["discountType"],
    discountValue: Number(row.discount_value),
    recipientName: row.recipient_name as string | null,
    recipientPhone: row.recipient_phone as string | null,
    note: row.note as string | null,
    expiresAt: row.expires_at as string | null,
    maxUses: row.max_uses as number | null,
    usesCount: Number(row.uses_count),
    active: Boolean(row.active),
    createdAt: String(row.created_at),
  };
}

export const adminListVouchers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminVoucherBase.parse(data))
  .handler(async ({ data }): Promise<{ vouchers: AdminVoucher[] }> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("discount_vouchers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { vouchers: (rows ?? []).map((row) => mapVoucher(row as Record<string, unknown>)) };
  });

const createVoucherSchema = adminVoucherBase.extend({
  code: z.string().trim().max(40).optional().nullable(),
  displayName: z.string().trim().max(100).optional().nullable(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().int().positive().max(100000000),
  recipientName: z.string().trim().max(120).optional().nullable(),
  recipientPhone: z.string().trim().max(30).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  expiresAt: z.string().trim().max(40).optional().nullable(),
  maxUses: z.number().int().positive().max(100000).optional().nullable(),
});

function makeVoucherCode() {
  return `DAF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const adminCreateVoucher = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createVoucherSchema.parse(data))
  .handler(async ({ data }): Promise<{ voucher: AdminVoucher }> => {
    await checkPasscode(data.passcode);
    if (data.discountType === "percent" && data.discountValue > 100) throw new Error("Percentage discount cannot exceed 100%.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = normalizeVoucherCode(data.code || makeVoucherCode());
    if (code.length < 3) throw new Error("Voucher code must be at least 3 characters.");
    const { data: row, error } = await supabaseAdmin.from("discount_vouchers").insert({
      code,
      display_name: data.displayName || null,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      recipient_name: data.recipientName || null,
      recipient_phone: data.recipientPhone ? normalizePhone(data.recipientPhone) : null,
      note: data.note || null,
      expires_at: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59.999Z`).toISOString() : null,
      max_uses: data.maxUses ?? null,
    } as never).select("*").single();
    if (error) {
      if (/duplicate key|unique/i.test(error.message)) throw new Error("That voucher code already exists.");
      throw new Error(error.message);
    }
    return { voucher: mapVoucher(row as Record<string, unknown>) };
  });

const toggleVoucherSchema = adminVoucherBase.extend({ id: z.string().uuid(), active: z.boolean() });

export const adminToggleVoucher = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => toggleVoucherSchema.parse(data))
  .handler(async ({ data }) => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("discount_vouchers").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Receipt ----------

const receiptSchema = z.object({
  orderCode: z.string().trim().min(1).max(20),
  trackCode: z.string().trim().min(4).max(20),
});

export type ReceiptOrder = AdminOrder;

export const getOrderReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => receiptSchema.parse(data))
  .handler(async ({ data }): Promise<{ order: ReceiptOrder }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_code", safeCode(data.orderCode))
      .or(`track_code.eq.${safeCode(data.trackCode)},order_code.eq.${safeCode(data.trackCode)}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!r) throw new Error("No order found for that tracking code.");
    return {
      order: {
        id: r.id,
        orderCode: r.order_code,
        trackCode: (r as { track_code: string | null }).track_code ?? "",
        customerName: r.customer_name,
        phone: r.phone,
        address: r.address,
        notes: r.notes,
        status: r.status as AdminOrder["status"],
        statusNote: r.status_note,
        eta: r.eta,
        items: (r.items as AdminOrder["items"]) ?? [],
        subtotal: r.subtotal,
        deliveryFee: r.delivery_fee,
        total: r.total,
        deliveryZone: r.delivery_zone,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        paymentStatus: r.payment_status as AdminOrder["paymentStatus"],
        paymentRejectionReason: r.payment_rejection_reason,
        paymentSubmittedAt: r.payment_submitted_at,
        paymentApprovedAt: r.payment_approved_at,
        discountAmount: r.discount_amount ?? 0,
        voucherCode: r.voucher_code,
        cancelledAt: r.cancelled_at,
        cancelledBy: r.cancelled_by,
        cancelReason: r.cancel_reason,
      },
    };
  });

// ---------- Payment ----------

const markPaidSchema = z.object({
  trackCode: z.string().trim().min(4).max(20),
});

export const markPaymentSubmitted = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => markPaidSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "submitted", payment_submitted_at: new Date().toISOString() })
      .or(`track_code.eq.${safeCode(data.trackCode)},order_code.eq.${safeCode(data.trackCode)}`)
      .in("payment_status", ["pending", "rejected"])
      .select("order_code")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Order not found or already submitted.");
    return { ok: true };
  });

const paymentDecisionSchema = z.object({
  passcode: z.string().min(1).max(200),
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const adminDecidePayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paymentDecisionSchema.parse(data))
  .handler(async ({ data }) => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: data.decision,
        payment_rejection_reason: data.decision === "rejected" ? (data.reason ?? null) : null,
        payment_approved_at: data.decision === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });