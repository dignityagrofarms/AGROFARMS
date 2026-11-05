import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner, parseAdminCredential } from "./orders.functions";
import {
  computeSettlement,
  buildChartData,
  type Settlement,
  type PartnerChartData,
} from "./partner-settlement";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerAuditEvent = {
  at: string;
  by: string;
  kind: "terms_amended" | "cycle_closed" | "cycle_reopened";
  reason?: string | null;
  from?: { profit: number; loss: number } | null;
  to?: { profit: number; loss: number } | null;
};

export interface FarmPartner {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  username: string;
  initialInvestment: number;
  investmentDate: string;
  agreedTerms: string | null;
  projectName: string;
  batchId: string | null;
  batchName?: string | null;
  status: "active" | "matured" | "completed" | "paused";
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Sharing terms
  profitSharePercentage: number;
  lossSharePercentage: number;
  // Cycle
  cycleName: string;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  cycleStatus: "open" | "closed";
  settledAt: string | null;
  auditLog: PartnerAuditEvent[];
  // Live computed result (identical on admin and partner side)
  settlement: Settlement;
}

export interface PartnerFinancial {
  id: string;
  partnerId: string;
  batchId: string | null;
  type: "expense" | "income" | "payout";
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNo: string | null;
  recordedBy: string | null;
  createdAt: string;
  removedAt: string | null;
  removedBy: string | null;
  removalReason: string | null;
}

export interface PartnerActivity {
  id: string;
  partnerId: string;
  batchId: string | null;
  activityDate: string;
  activityType:
    | "Stock / Birds Received"
    | "Feeding"
    | "Mortality Record"
    | "Weight Check"
    | "Medication / Vaccination"
    | "Cleaning & Sanitation"
    | "Harvest & Sales Offload"
    | "General Note";
  stockHeadcount: number;
  mortalityCount: number;
  causeOfMortality: string | null;
  feedConsumedKg: number;
  averageWeightKg: number;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  removedAt: string | null;
  removedBy: string | null;
  removalReason: string | null;
}

export interface PartnerDashboardData {
  partner: FarmPartner;
  financials: PartnerFinancial[];
  activities: PartnerActivity[];
  charts: PartnerChartData;
  summary: {
    currentStockCount: number;
    totalFeedConsumedKg: number;
    totalMortalityCount: number;
    mortalityRatePercent: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashPasscode(passcode: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passcode));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Signed partner session token (HMAC-SHA256, 12h expiry). The partner's
// password is never stored in the browser or re-sent after login.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sessionSecret(): string {
  return (
    process.env.PARTNER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_PASSCODE ||
    "dignity-agro-partner-session"
  );
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signSession(partnerId: string, username: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ pid: partnerId, u: username, exp: expiresAt })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload)));
  return { token: `${payload}.${b64url(sig)}`, expiresAt };
}

async function verifySession(token: string): Promise<{ pid: string; u: string }> {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) throw new Error("Your session is invalid. Please sign in again.");
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    fromB64url(sig),
    new TextEncoder().encode(payload),
  );
  if (!ok) throw new Error("Your session is invalid. Please sign in again.");
  const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { pid: string; u: string; exp: number };
  if (!data.exp || Date.now() > data.exp) throw new Error("Your session has expired. Please sign in again.");
  return { pid: data.pid, u: data.u };
}

const mapFin = (r: any): PartnerFinancial => ({
  id: r.id,
  partnerId: r.partner_id,
  batchId: r.batch_id,
  type: r.type,
  category: r.category,
  amount: Number(r.amount) || 0,
  description: r.description,
  paymentMethod: r.payment_method || "Bank Transfer",
  transactionDate: r.transaction_date,
  referenceNo: r.reference_no,
  recordedBy: r.recorded_by,
  createdAt: r.created_at,
  removedAt: r.removed_at ?? null,
  removedBy: r.removed_by ?? null,
  removalReason: r.removal_reason ?? null,
});

const mapAct = (r: any): PartnerActivity => ({
  id: r.id,
  partnerId: r.partner_id,
  batchId: r.batch_id,
  activityDate: r.activity_date,
  activityType: r.activity_type,
  stockHeadcount: Number(r.stock_headcount) || 0,
  mortalityCount: Number(r.mortality_count) || 0,
  causeOfMortality: r.cause_of_mortality,
  feedConsumedKg: Number(r.feed_consumed_kg) || 0,
  averageWeightKg: Number(r.average_weight_kg) || 0,
  notes: r.notes,
  recordedBy: r.recorded_by,
  createdAt: r.created_at,
  removedAt: r.removed_at ?? null,
  removedBy: r.removed_by ?? null,
  removalReason: r.removal_reason ?? null,
});

function mapPartner(p: any, finRows: any[]): FarmPartner {
  const initial = Number(p.initial_investment) || 0;
  const profitPct = Number(p.profit_share_percentage ?? 50);
  const lossPct = Number(p.loss_share_percentage ?? 100);
  const settlement = computeSettlement(
    { initialInvestment: initial, profitSharePercentage: profitPct, lossSharePercentage: lossPct },
    finRows.map((r) => ({ type: r.type, amount: Number(r.amount) || 0, removedAt: r.removed_at ?? null })),
  );
  return {
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    email: p.email,
    address: p.address,
    username: p.username,
    initialInvestment: initial,
    investmentDate: p.investment_date,
    agreedTerms: p.agreed_terms,
    projectName: p.project_name || "Broiler Cycle Partnership",
    batchId: p.batch_id,
    batchName: p.farm_batches?.batch_name ?? null,
    status: p.status,
    active: Boolean(p.active),
    lastLoginAt: p.last_login_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    profitSharePercentage: profitPct,
    lossSharePercentage: lossPct,
    cycleName: p.cycle_name || "Cycle 1",
    cycleStartDate: p.cycle_start_date ?? null,
    cycleEndDate: p.cycle_end_date ?? null,
    cycleStatus: p.cycle_status === "closed" ? "closed" : "open",
    settledAt: p.settled_at ?? null,
    auditLog: Array.isArray(p.terms_history) ? p.terms_history : [],
    settlement,
  };
}

async function loadPartnerBundle(supabaseAdmin: any, partnerId: string) {
  const { data: p, error: pErr } = await supabaseAdmin
    .from("farm_partners")
    .select("*, farm_batches(batch_name)")
    .eq("id", partnerId)
    .single();
  if (pErr || !p) throw new Error("Partner record not found.");

  const { data: finRows, error: fErr } = await supabaseAdmin
    .from("partner_financials")
    .select("*")
    .eq("partner_id", partnerId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (fErr) throw new Error(fErr.message);

  const { data: actRows, error: aErr } = await supabaseAdmin
    .from("partner_activities")
    .select("*")
    .eq("partner_id", partnerId)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (aErr) throw new Error(aErr.message);

  const partner = mapPartner(p, finRows || []);
  const financials = (finRows || []).map(mapFin);
  const activities = (actRows || []).map(mapAct);
  return { partner, financials, activities, raw: p };
}

function buildSummaryAndCharts(financials: PartnerFinancial[], activities: PartnerActivity[]) {
  const live = activities.filter((a) => !a.removedAt);
  const stocked = live.reduce((s, a) => s + a.stockHeadcount, 0);
  const mortality = live.reduce((s, a) => s + a.mortalityCount, 0);
  const feed = live.reduce((s, a) => s + a.feedConsumedKg, 0);
  return {
    summary: {
      currentStockCount: Math.max(0, stocked - mortality),
      totalFeedConsumedKg: Math.round(feed * 10) / 10,
      totalMortalityCount: mortality,
      mortalityRatePercent: stocked > 0 ? Math.round((mortality / stocked) * 1000) / 10 : 0,
    },
    charts: buildChartData(
      financials.map((f) => ({
        type: f.type,
        amount: f.amount,
        removedAt: f.removedAt,
        category: f.category,
        transactionDate: f.transactionDate,
      })),
      live.map((a) => ({
        activityDate: a.activityDate,
        stockHeadcount: a.stockHeadcount,
        mortalityCount: a.mortalityCount,
        feedConsumedKg: a.feedConsumedKg,
        removedAt: a.removedAt,
      })),
    ),
  };
}

async function assertCycleOpen(supabaseAdmin: any, partnerId: string) {
  const { data } = await supabaseAdmin.from("farm_partners").select("cycle_status").eq("id", partnerId).single();
  if (data?.cycle_status === "closed") {
    throw new Error("This cycle is closed and settled. Re-open the cycle to make changes.");
  }
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
const pct = z.number().min(0, "Percentage cannot be below 0").max(100, "Percentage cannot exceed 100");

// ─── Owner Admin Server Functions ─────────────────────────────────────────────

export const adminListPartners = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<FarmPartner[]> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: partners, error: pErr } = await supabaseAdmin
      .from("farm_partners")
      .select("*, farm_batches(batch_name)")
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    const { data: financials, error: fErr } = await supabaseAdmin
      .from("partner_financials")
      .select("partner_id, type, amount, removed_at");
    if (fErr) throw new Error(fErr.message);

    const byPartner = new Map<string, any[]>();
    for (const f of financials || []) {
      const arr = byPartner.get(f.partner_id) || [];
      arr.push(f);
      byPartner.set(f.partner_id, arr);
    }

    return (partners || []).map((p: any) => mapPartner(p, byPartner.get(p.id) || []));
  });

export const adminGetPartnerDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1), partnerId: z.string().uuid() }).parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      partner: FarmPartner;
      financials: PartnerFinancial[];
      activities: PartnerActivity[];
      charts: PartnerChartData;
      summary: PartnerDashboardData["summary"];
    }> => {
      await checkOwner(data.passcode);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { partner, financials, activities } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
      return { partner, financials, activities, ...buildSummaryAndCharts(financials, activities) };
    },
  );

export const adminCreatePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        fullName: z.string().trim().min(2, "Partner full name is required"),
        phone: z.string().trim().min(7, "Valid phone number is required"),
        email: z.string().trim().email().optional().nullable(),
        address: z.string().trim().optional().nullable(),
        username: z
          .string()
          .trim()
          .toLowerCase()
          .min(3, "Username must be at least 3 characters")
          .max(40)
          .regex(/^[a-z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, and dots"),
        password: z.string().trim().min(6, "Password must be at least 6 characters"),
        initialInvestment: z.number().min(0, "Investment amount cannot be negative"),
        investmentDate: dateStr,
        profitSharePercentage: pct,
        lossSharePercentage: pct,
        agreedTerms: z.string().trim().optional().nullable(),
        projectName: z.string().trim().min(2).default("Broiler Cycle Partnership"),
        cycleName: z.string().trim().min(2).default("Cycle 1"),
        cycleStartDate: dateStr,
        cycleEndDate: dateStr.optional().nullable(),
        batchId: z.string().uuid().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const reserved = ["owner", "admin", "staff", "manager", "everyone", "system"];
    if (reserved.includes(data.username)) {
      throw new Error(`The username '${data.username}' is reserved. Please pick another username.`);
    }
    if (data.cycleEndDate && data.cycleEndDate < data.cycleStartDate) {
      throw new Error("Cycle end date cannot be before the start date.");
    }

    const { data: existingP } = await supabaseAdmin
      .from("farm_partners")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (existingP) throw new Error(`A partner with username '${data.username}' already exists.`);

    const hash = await hashPasscode(data.password);

    const { data: inserted, error } = await supabaseAdmin
      .from("farm_partners")
      .insert({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        username: data.username,
        passcode_hash: hash,
        initial_investment: data.initialInvestment,
        investment_date: data.investmentDate,
        profit_share_percentage: data.profitSharePercentage,
        loss_share_percentage: data.lossSharePercentage,
        agreed_terms: data.agreedTerms || null,
        project_name: data.projectName,
        cycle_name: data.cycleName,
        cycle_start_date: data.cycleStartDate,
        cycle_end_date: data.cycleEndDate || null,
        cycle_status: "open",
        batch_id: data.batchId || null,
        status: "active",
        active: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, partnerId: inserted.id };
  });

export const adminUpdatePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        fullName: z.string().trim().min(2),
        phone: z.string().trim().min(7),
        email: z.string().trim().email().optional().nullable(),
        address: z.string().trim().optional().nullable(),
        initialInvestment: z.number().min(0),
        investmentDate: dateStr,
        profitSharePercentage: pct,
        lossSharePercentage: pct,
        agreedTerms: z.string().trim().optional().nullable(),
        projectName: z.string().trim().min(2),
        cycleName: z.string().trim().min(2),
        cycleStartDate: dateStr,
        cycleEndDate: dateStr.optional().nullable(),
        batchId: z.string().uuid().optional().nullable(),
        status: z.enum(["active", "matured", "completed", "paused"]),
        /** Required when sharing terms or capital change after entries exist */
        amendReason: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    const { data: current, error: cErr } = await supabaseAdmin
      .from("farm_partners")
      .select("*")
      .eq("id", data.partnerId)
      .single();
    if (cErr || !current) throw new Error("Partner record not found.");

    if (data.cycleEndDate && data.cycleEndDate < data.cycleStartDate) {
      throw new Error("Cycle end date cannot be before the start date.");
    }

    const oldProfit = Number(current.profit_share_percentage ?? 50);
    const oldLoss = Number(current.loss_share_percentage ?? 100);
    const oldCapital = Number(current.initial_investment) || 0;
    const termsChanged =
      oldProfit !== data.profitSharePercentage ||
      oldLoss !== data.lossSharePercentage ||
      oldCapital !== data.initialInvestment;

    const auditLog: PartnerAuditEvent[] = Array.isArray(current.terms_history) ? [...current.terms_history] : [];

    if (termsChanged) {
      if (current.cycle_status === "closed") {
        throw new Error("This cycle is closed and settled. Re-open the cycle before amending terms or capital.");
      }
      const { count } = await supabaseAdmin
        .from("partner_financials")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", data.partnerId)
        .is("removed_at", null);
      if ((count || 0) > 0) {
        if (!data.amendReason || data.amendReason.length < 3) {
          throw new Error("Entries already exist. Please give a reason for amending the sharing terms or capital.");
        }
      }
      auditLog.push({
        at: new Date().toISOString(),
        by: cred.username || "owner",
        kind: "terms_amended",
        reason: data.amendReason || "Terms updated before any entries were recorded",
        from: { profit: oldProfit, loss: oldLoss },
        to: { profit: data.profitSharePercentage, loss: data.lossSharePercentage },
      });
    }

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        initial_investment: data.initialInvestment,
        investment_date: data.investmentDate,
        profit_share_percentage: data.profitSharePercentage,
        loss_share_percentage: data.lossSharePercentage,
        agreed_terms: data.agreedTerms || null,
        project_name: data.projectName,
        cycle_name: data.cycleName,
        cycle_start_date: data.cycleStartDate,
        cycle_end_date: data.cycleEndDate || null,
        batch_id: data.batchId || null,
        status: data.status,
        terms_history: auditLog,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.partnerId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminClosePartnerCycle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1), partnerId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    const { partner, raw } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
    if (partner.cycleStatus === "closed") throw new Error("This cycle is already closed.");

    const now = new Date().toISOString();
    const auditLog: PartnerAuditEvent[] = Array.isArray(raw.terms_history) ? [...raw.terms_history] : [];
    auditLog.push({ at: now, by: cred.username || "owner", kind: "cycle_closed", reason: null });

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        cycle_status: "closed",
        settled_at: now,
        status: "completed",
        settlement_snapshot: {
          settledAt: now,
          settledBy: cred.username || "owner",
          profitSharePercentage: partner.profitSharePercentage,
          lossSharePercentage: partner.lossSharePercentage,
          initialInvestment: partner.initialInvestment,
          settlement: partner.settlement,
        },
        terms_history: auditLog,
        updated_at: now,
      })
      .eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReopenPartnerCycle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        reason: z.string().trim().min(3, "Please give a reason for re-opening the cycle").max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    const { raw } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
    const now = new Date().toISOString();
    const auditLog: PartnerAuditEvent[] = Array.isArray(raw.terms_history) ? [...raw.terms_history] : [];
    auditLog.push({ at: now, by: cred.username || "owner", kind: "cycle_reopened", reason: data.reason });

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        cycle_status: "open",
        settled_at: null,
        settlement_snapshot: null,
        status: "active",
        terms_history: auditLog,
        updated_at: now,
      })
      .eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetPartnerPasscode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        newPassword: z.string().trim().min(6, "Password must be at least 6 characters"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const hash = await hashPasscode(data.newPassword);
    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({ passcode_hash: hash, updated_at: new Date().toISOString() })
      .eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTogglePartnerActive = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string().min(1), partnerId: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({ active: data.active, updated_at: new Date().toISOString() })
      .eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1), partnerId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("farm_partners").delete().eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRecordPartnerFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        batchId: z.string().uuid().optional().nullable(),
        type: z.enum(["expense", "income", "payout"]),
        category: z.string().trim().min(2),
        amount: z.number().min(0.01, "Amount must be greater than zero"),
        description: z.string().trim().min(2),
        paymentMethod: z.string().default("Bank Transfer"),
        transactionDate: dateStr,
        referenceNo: z.string().trim().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    const { partner } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
    if (partner.cycleStatus === "closed" && data.type !== "payout") {
      throw new Error("This cycle is closed and settled. Re-open the cycle to add expenses or income.");
    }
    if (data.type === "payout") {
      const owed = partner.settlement.balanceOwed;
      if (data.amount > owed + 0.01) {
        throw new Error(
          `Payout of ₦${data.amount.toLocaleString("en-NG")} exceeds the balance currently owed to this partner (₦${Math.max(0, owed).toLocaleString("en-NG")}).`,
        );
      }
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("partner_financials")
      .insert({
        partner_id: data.partnerId,
        batch_id: data.batchId || null,
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        payment_method: data.paymentMethod,
        transaction_date: data.transactionDate,
        reference_no: data.referenceNo || null,
        recorded_by: cred.username || "owner",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

/** Soft delete: the entry is retained and shown to the partner as "removed". */
export const adminDeletePartnerFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        financialId: z.string().uuid(),
        reason: z.string().trim().min(3, "Please give a reason for removing this entry").max(300),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    const { data: row } = await supabaseAdmin
      .from("partner_financials")
      .select("partner_id, removed_at")
      .eq("id", data.financialId)
      .single();
    if (!row) throw new Error("Entry not found.");
    if (row.removed_at) throw new Error("This entry has already been removed.");
    await assertCycleOpen(supabaseAdmin, row.partner_id);

    const { error } = await supabaseAdmin
      .from("partner_financials")
      .update({
        removed_at: new Date().toISOString(),
        removed_by: cred.username || "owner",
        removal_reason: data.reason,
      })
      .eq("id", data.financialId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRecordPartnerActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        batchId: z.string().uuid().optional().nullable(),
        activityDate: dateStr,
        activityType: z.enum([
          "Stock / Birds Received",
          "Feeding",
          "Mortality Record",
          "Weight Check",
          "Medication / Vaccination",
          "Cleaning & Sanitation",
          "Harvest & Sales Offload",
          "General Note",
        ]),
        stockHeadcount: z.number().int().default(0),
        mortalityCount: z.number().int().default(0),
        causeOfMortality: z.string().trim().optional().nullable(),
        feedConsumedKg: z.number().default(0),
        averageWeightKg: z.number().default(0),
        notes: z.string().trim().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);
    await assertCycleOpen(supabaseAdmin, data.partnerId);

    const { data: inserted, error } = await supabaseAdmin
      .from("partner_activities")
      .insert({
        partner_id: data.partnerId,
        batch_id: data.batchId || null,
        activity_date: data.activityDate,
        activity_type: data.activityType,
        stock_headcount: data.stockHeadcount,
        mortality_count: data.mortalityCount,
        cause_of_mortality: data.causeOfMortality || null,
        feed_consumed_kg: data.feedConsumedKg,
        average_weight_kg: data.averageWeightKg,
        notes: data.notes || null,
        recorded_by: cred.username || "owner",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const adminDeletePartnerActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        activityId: z.string().uuid(),
        reason: z.string().trim().min(3, "Please give a reason for removing this log").max(300),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    const { data: row } = await supabaseAdmin
      .from("partner_activities")
      .select("partner_id, removed_at")
      .eq("id", data.activityId)
      .single();
    if (!row) throw new Error("Activity not found.");
    if (row.removed_at) throw new Error("This log has already been removed.");
    await assertCycleOpen(supabaseAdmin, row.partner_id);

    const { error } = await supabaseAdmin
      .from("partner_activities")
      .update({
        removed_at: new Date().toISOString(),
        removed_by: cred.username || "owner",
        removal_reason: data.reason,
      })
      .eq("id", data.activityId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Partner Portal Server Functions (Strict Multi-Tenant Isolation) ──────────

export const partnerVerifyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        username: z.string().trim().toLowerCase().min(1),
        passcode: z.string().trim().min(1),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; token: string; expiresAt: number; fullName: string; username: string }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: partner, error } = await supabaseAdmin
        .from("farm_partners")
        .select("id, full_name, username, passcode_hash, active")
        .eq("username", data.username)
        .maybeSingle();

      if (error || !partner) throw new Error("Invalid partner username or passcode.");
      if (!partner.active) {
        throw new Error("This partner account is inactive. Please contact Dignity Agro Farms administration.");
      }

      const targetHash = await hashPasscode(data.passcode);
      if (partner.passcode_hash !== targetHash) throw new Error("Invalid partner username or passcode.");

      void supabaseAdmin
        .from("farm_partners")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", partner.id);

      const { token, expiresAt } = await signSession(partner.id, partner.username);
      return { ok: true, token, expiresAt, fullName: partner.full_name, username: partner.username };
    },
  );

export const partnerGetMyDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(10) }).parse(data))
  .handler(async ({ data }): Promise<PartnerDashboardData> => {
    const session = await verifySession(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The partner id comes ONLY from the signed token, so a partner can never
    // request another partner's data.
    const { partner, financials, activities } = await loadPartnerBundle(supabaseAdmin, session.pid);
    if (!partner.active) {
      throw new Error("Your partner account is inactive. Contact Dignity Agro Farms administration.");
    }

    // Partners never see internal admin usernames, only "Farm Management".
    const MASK = "Farm Management";
    const maskedPartner: FarmPartner = {
      ...partner,
      auditLog: partner.auditLog.map((e) => ({ ...e, by: MASK })),
    };
    const maskedFin = financials.map((f) => ({
      ...f,
      recordedBy: f.recordedBy ? MASK : null,
      removedBy: f.removedBy ? MASK : null,
    }));
    const maskedAct = activities.map((a) => ({
      ...a,
      recordedBy: a.recordedBy ? MASK : null,
      removedBy: a.removedBy ? MASK : null,
    }));

    return {
      partner: maskedPartner,
      financials: maskedFin,
      activities: maskedAct,
      ...buildSummaryAndCharts(financials, activities),
    };
  });
