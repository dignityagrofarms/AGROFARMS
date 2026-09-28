import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReservationType = "slot_reserved" | "free_reservation" | "outright";
export type PreorderPaymentStatus = "pending" | "partially_paid" | "fully_paid";
export type DeliveryStatus = "pending" | "delivered";

export type PreorderPayment = {
  id: string;
  preorderId: string;
  paymentReference: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  confirmedByAdmin: boolean;
  createdAt: string;
};

export type Preorder = {
  id: string;
  preorderCode: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  reservationType: ReservationType;
  paymentStatus: PreorderPaymentStatus;
  deliveryStatus: DeliveryStatus;
  preferredDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: PreorderPayment[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePreorderCode(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `DEC-${n}`;
}

function makePaymentRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 0xfffff).toString(16).toUpperCase().padStart(5, "0");
  return `DAF-${ts}-${rand}`;
}

function mapPreorder(r: Record<string, unknown>): Preorder {
  return {
    id: r.id as string,
    preorderCode: r.preorder_code as string,
    customerName: r.customer_name as string,
    phone: r.phone as string,
    email: (r.email as string) ?? "",
    address: r.address as string,
    product: r.product as string,
    quantity: r.quantity as number,
    unitPrice: r.unit_price as number,
    totalAmount: r.total_amount as number,
    amountPaid: r.amount_paid as number,
    balance: r.balance as number,
    reservationType: r.reservation_type as ReservationType,
    paymentStatus: r.payment_status as PreorderPaymentStatus,
    deliveryStatus: r.delivery_status as DeliveryStatus,
    preferredDeliveryDate: r.preferred_delivery_date as string | null,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapPayment(r: Record<string, unknown>): PreorderPayment {
  return {
    id: r.id as string,
    preorderId: r.preorder_id as string,
    paymentReference: r.payment_reference as string,
    amount: r.amount as number,
    paymentMethod: r.payment_method as string,
    paymentDate: r.payment_date as string,
    confirmedByAdmin: r.confirmed_by_admin as boolean,
    createdAt: r.created_at as string,
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function checkAdminPasscode(passcode: string): Promise<void> {
  const { checkPasscode } = await import("@/lib/orders.functions");
  await checkPasscode(passcode);
}

// ─── Server Functions ─────────────────────────────────────────────────────────

const createPreorderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(200).optional().default(""),
  address: z.string().trim().min(3).max(300),
  product: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(500),
  unitPrice: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  reservationType: z.enum(["slot_reserved", "free_reservation", "outright"]),
  preferredDeliveryDate: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createPreorder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createPreorderSchema.parse(data))
  .handler(async ({ data }): Promise<{ preorderCode: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // For slot_reserved, the initial payment is ₦3,500 — submitted immediately
    // but NOT confirmed (admin must confirm). The balance is unchanged until confirmation.
    const preorderCode = makePreorderCode();
    const { error } = await supabaseAdmin.from("preorders").insert({
      preorder_code: preorderCode,
      customer_name: data.customerName,
      phone: data.phone,
      email: data.email ?? "",
      address: data.address,
      product: data.product,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      total_amount: data.totalAmount,
      amount_paid: 0,
      reservation_type: data.reservationType,
      payment_status: "pending",
      delivery_status: "pending",
      preferred_delivery_date: data.preferredDeliveryDate ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { preorderCode };
  });

// ─── Get preorder by code (public) ───────────────────────────────────────────

export const getPreorderByCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ preorderCode: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ preorder: Preorder; payments: PreorderPayment[] } | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("preorders")
      .select("*")
      .eq("preorder_code", data.preorderCode.toUpperCase().trim())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { data: payments, error: pe } = await supabaseAdmin
      .from("preorder_payments")
      .select("*")
      .eq("preorder_id", row.id)
      .order("payment_date", { ascending: true });
    if (pe) throw new Error(pe.message);
    return {
      preorder: mapPreorder(row as Record<string, unknown>),
      payments: (payments ?? []).map((p) => mapPayment(p as Record<string, unknown>)),
    };
  });

// ─── Get preorders by phone (customer dashboard) ──────────────────────────────

export const getPreordersByPhone = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ phone: z.string().trim().min(7).max(30) }).parse(data))
  .handler(async ({ data }): Promise<Preorder[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedPhone = data.phone.replace(/\D+/g, "");
    const { data: rows, error } = await supabaseAdmin
      .from("preorders")
      .select("*")
      .or(`phone.ilike.%${normalizedPhone}%`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => mapPreorder(r as Record<string, unknown>));
  });

// ─── Submit payment claim (customer side, manual transfer) ────────────────────

const submitPaymentSchema = z.object({
  preorderCode: z.string().trim().min(1),
  amount: z.number().int().min(1),
  paymentReference: z.string().trim().min(1).max(100).optional(),
});

export const submitPreorderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitPaymentSchema.parse(data))
  .handler(async ({ data }): Promise<{ paymentReference: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch preorder
    const { data: preorder, error: pe } = await supabaseAdmin
      .from("preorders")
      .select("id, total_amount, amount_paid, payment_status")
      .eq("preorder_code", data.preorderCode.toUpperCase().trim())
      .maybeSingle();
    if (pe || !preorder) throw new Error("Pre-order not found.");

    // Prevent re-submitting if already fully paid
    if (preorder.payment_status === "fully_paid") throw new Error("This order is already fully paid.");

    const ref = data.paymentReference?.trim() || makePaymentRef();

    // Check for duplicate reference
    const { data: existing } = await supabaseAdmin
      .from("preorder_payments")
      .select("id")
      .eq("payment_reference", ref)
      .maybeSingle();
    if (existing) return { paymentReference: ref }; // idempotent

    // Insert unconfirmed payment (admin must confirm)
    const { error } = await supabaseAdmin.from("preorder_payments").insert({
      preorder_id: preorder.id,
      payment_reference: ref,
      amount: data.amount,
      payment_method: "bank_transfer",
      payment_date: new Date().toISOString(),
      confirmed_by_admin: false,
    });
    if (error) throw new Error(error.message);

    return { paymentReference: ref };
  });

// ─── Admin: list all pre-orders ───────────────────────────────────────────────

const adminListPreordersSchema = z.object({
  passcode: z.string().min(1).max(200),
  reservationType: z.string().optional(),
  paymentStatus: z.string().optional(),
  deliveryStatus: z.string().optional(),
  search: z.string().trim().max(120).optional(),
});

export const adminListPreorders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminListPreordersSchema.parse(data))
  .handler(async ({ data }): Promise<{ preorders: Preorder[] }> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin.from("preorders").select("*");
    if (data.reservationType) q = q.eq("reservation_type", data.reservationType);
    if (data.paymentStatus) q = q.eq("payment_status", data.paymentStatus);
    if (data.deliveryStatus) q = q.eq("delivery_status", data.deliveryStatus);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`preorder_code.ilike.%${s}%,customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { preorders: (rows ?? []).map((r) => mapPreorder(r as Record<string, unknown>)) };
  });

// ─── Admin: get single pre-order with payments ────────────────────────────────

export const adminGetPreorderDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1), preorderCode: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ preorder: Preorder; payments: PreorderPayment[] }> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("preorders")
      .select("*")
      .eq("preorder_code", data.preorderCode.toUpperCase().trim())
      .maybeSingle();
    if (error || !row) throw new Error("Pre-order not found.");

    const { data: payments, error: pe } = await supabaseAdmin
      .from("preorder_payments")
      .select("*")
      .eq("preorder_id", row.id)
      .order("payment_date", { ascending: true });
    if (pe) throw new Error(pe.message);

    return {
      preorder: mapPreorder(row as Record<string, unknown>),
      payments: (payments ?? []).map((p) => mapPayment(p as Record<string, unknown>)),
    };
  });

// ─── Admin: confirm a payment ─────────────────────────────────────────────────

const adminConfirmPaymentSchema = z.object({
  passcode: z.string().min(1).max(200),
  paymentId: z.string().uuid(),
});

export const adminConfirmPreorderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminConfirmPaymentSchema.parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("preorder_payments")
      .update({ confirmed_by_admin: true })
      .eq("id", data.paymentId);
    if (error) throw new Error(error.message);
  });

// ─── Admin: reject/remove a payment ──────────────────────────────────────────

export const adminDeletePreorderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1), paymentId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("preorder_payments").delete().eq("id", data.paymentId);
    if (error) throw new Error(error.message);
  });

// ─── Admin: update delivery status ───────────────────────────────────────────

export const adminUpdatePreorderDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string().min(1),
      preorderId: z.string().uuid(),
      deliveryStatus: z.enum(["pending", "delivered"]),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<void> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("preorders")
      .update({ delivery_status: data.deliveryStatus })
      .eq("id", data.preorderId);
    if (error) throw new Error(error.message);
  });

// ─── Admin: add manual payment (admin-initiated confirmation) ─────────────────

const adminAddPaymentSchema = z.object({
  passcode: z.string().min(1).max(200),
  preorderId: z.string().uuid(),
  amount: z.number().int().min(1),
  paymentReference: z.string().trim().min(1).max(100),
  paymentDate: z.string().optional(),
});

export const adminAddPreorderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminAddPaymentSchema.parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("preorder_payments").insert({
      preorder_id: data.preorderId,
      payment_reference: data.paymentReference,
      amount: data.amount,
      payment_method: "bank_transfer",
      payment_date: data.paymentDate ?? new Date().toISOString(),
      confirmed_by_admin: true,
    });
    if (error) throw new Error(error.message);
  });

// ─── Admin: list all pending (unconfirmed) payments ───────────────────────────

export const adminListPendingPayments = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ payment: PreorderPayment; preorder: Preorder }[]> => {
    await checkAdminPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("preorder_payments")
      .select("*, preorders(*)")
      .eq("confirmed_by_admin", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      payment: mapPayment(r as Record<string, unknown>),
      preorder: mapPreorder((r as Record<string, unknown>).preorders as Record<string, unknown>),
    }));
  });
