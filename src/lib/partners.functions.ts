import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner, checkPasscode, parseAdminCredential } from "./orders.functions";
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
  kind:
    | "terms_amended"
    | "cycle_closed"
    | "cycle_reopened"
    | "agreement_signed"
    | "cycle_rollover"
    | "payout_election"
    | "cycle_archive_data";
  reason?: string | null;
  from?: { profit: number; loss: number } | null;
  to?: { profit: number; loss: number } | null;
  meta?: any;
};

export interface PartnerPayoutElection {
  choice: "bank_payout" | "rollover_principal" | "rollover_all";
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  notes?: string | null;
  submittedAt: string;
  status: "pending_review" | "acknowledged" | "completed";
}

export interface PartnerCycleArchive {
  cycleId: string;
  cycleName: string;
  projectName: string;
  batchId: string | null;
  batchName?: string | null;
  initialInvestment: number;
  profitSharePercentage: number;
  lossSharePercentage: number;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  settledAt: string;
  settledBy: string;
  settlement: Settlement;
  summary: PartnerDashboardSummary;
  financials: PartnerFinancial[];
  activities: PartnerActivity[];
  agreementSigned: boolean;
  agreementSignedAt: string | null;
  agreementSignedBy: string | null;
}

export interface PartnerDashboardSummary {
  initialStockCount: number;
  currentStockCount: number;
  totalFeedConsumedKg: number;
  totalMortalityCount: number;
  mortalityRatePercent: number;
  latestAverageWeightKg: number;
  estimatedBiomassKg: number;
  fcr: number | null;
  costPerLiveBird: number | null;
  breakEvenPricePerBird: number | null;
  pendingApprovalsCount: number;
  feedBagStats?: {
    bagsBought: number;
    bagsFinished: number;
    currentOpenBagNo: number | null;
    bagsInStock: number;
    avgCostPerBag: number;
  } | null;
}

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
  // Terms & Conditions and Digital Signing
  agreementTerms: string | null;
  agreementSigned: boolean;
  agreementSignedAt: string | null;
  agreementSignedBy: string | null;
  agreementSignatureData: string | null;
  agreementDocumentUrl: string | null;
  agreementDocumentName: string | null;
  agreementDocumentSize: string | null;
  agreementDocumentUploadedAt: string | null;
  agreementDocumentUploadedBy: string | null;
  // Multi-Cycle History & Partner Elections
  archivedCycles: PartnerCycleArchive[];
  payoutElection: PartnerPayoutElection | null;
  pendingApprovalsCount?: number;
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
  // Approval & Evidence Attachments
  approvalStatus: "approved" | "pending_approval" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  receiptUrl: string | null;
  attachmentName: string | null;
  cycleName?: string | null;
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
  // Approval & Visual Evidence
  approvalStatus: "approved" | "pending_approval" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  photoUrl: string | null;
  cycleName?: string | null;
}

export interface PartnerDashboardData {
  partner: FarmPartner;
  financials: PartnerFinancial[];
  activities: PartnerActivity[];
  charts: PartnerChartData;
  summary: PartnerDashboardSummary;
}

// ─── Role Guard: Owner or Manager Only (Staff Strictly Blocked) ───────────────

async function checkOwnerOrManager(
  value: string,
): Promise<{ role: "owner" | "manager"; username: string }> {
  const role = await checkPasscode(value);
  if (role !== "owner" && role !== "manager") {
    throw new Error("Access denied. Partner operations are restricted to Owner and Manager only.");
  }
  if (role === "manager") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settingRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "hide_partners_from_manager")
      .maybeSingle();
    if (settingRow?.value === "true") {
      throw new Error("Access denied. Partner dashboard and records have been restricted to Owner-only by the Farm Owner.");
    }
  }
  const cred = parseAdminCredential(value);
  return { role, username: cred.username || role };
}

// ─── Helpers & Metadata Packing (Schema-Resilient) ────────────────────────────

const ARCHIVED_PREFIX = "__ARCHIVED_CYCLE__:";
const META_MARKER = "\n__DAF_META__:";

interface EmbeddedRowMeta {
  approvalStatus?: "approved" | "pending_approval" | "rejected";
  approvedBy?: string | null;
  approvedAt?: string | null;
  receiptUrl?: string | null;
  attachmentName?: string | null;
  photoUrl?: string | null;
  cycleName?: string | null;
}

function packTextWithMeta(text: string | null | undefined, meta: EmbeddedRowMeta): string {
  const clean = (text || "").split(META_MARKER)[0];
  const hasAny =
    (meta.approvalStatus && meta.approvalStatus !== "approved") ||
    meta.receiptUrl ||
    meta.attachmentName ||
    meta.photoUrl ||
    meta.cycleName;
  if (!hasAny) return clean;
  return `${clean}${META_MARKER}${JSON.stringify(meta)}`;
}

function unpackTextAndMeta(raw: string | null | undefined): {
  cleanText: string | null;
  meta: EmbeddedRowMeta;
} {
  if (!raw) return { cleanText: null, meta: {} };
  const idx = raw.indexOf(META_MARKER);
  if (idx === -1) return { cleanText: raw, meta: {} };
  const cleanText = raw.slice(0, idx) || null;
  try {
    const meta = JSON.parse(raw.slice(idx + META_MARKER.length)) as EmbeddedRowMeta;
    return { cleanText, meta: meta || {} };
  } catch {
    return { cleanText: raw, meta: {} };
  }
}

async function hashPasscode(passcode: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passcode));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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

const mapFin = (r: any): PartnerFinancial => {
  const { cleanText: cleanDesc, meta } = unpackTextAndMeta(r.description);
  const approvalStatus: "approved" | "pending_approval" | "rejected" =
    r.approval_status || meta.approvalStatus || "approved";

  return {
    id: r.id,
    partnerId: r.partner_id,
    batchId: r.batch_id,
    type: r.type,
    category: r.category,
    amount: Number(r.amount) || 0,
    description: cleanDesc || r.description || "",
    paymentMethod: r.payment_method || "Bank Transfer",
    transactionDate: r.transaction_date,
    referenceNo: r.reference_no,
    recordedBy: r.recorded_by,
    createdAt: r.created_at,
    removedAt: r.removed_at ?? null,
    removedBy: r.removed_by ?? null,
    removalReason: r.removal_reason ?? null,
    approvalStatus,
    approvedBy: r.approved_by ?? meta.approvedBy ?? null,
    approvedAt: r.approved_at ?? meta.approvedAt ?? null,
    receiptUrl: r.receipt_url ?? meta.receiptUrl ?? null,
    attachmentName: r.attachment_name ?? meta.attachmentName ?? null,
    cycleName: r.cycle_name ?? meta.cycleName ?? null,
  };
};

const mapAct = (r: any): PartnerActivity => {
  const { cleanText: cleanNotes, meta } = unpackTextAndMeta(r.notes);
  const approvalStatus: "approved" | "pending_approval" | "rejected" =
    r.approval_status || meta.approvalStatus || "approved";

  return {
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
    notes: cleanNotes,
    recordedBy: r.recorded_by,
    createdAt: r.created_at,
    removedAt: r.removed_at ?? null,
    removedBy: r.removed_by ?? null,
    removalReason: r.removal_reason ?? null,
    approvalStatus,
    approvedBy: r.approved_by ?? meta.approvedBy ?? null,
    approvedAt: r.approved_at ?? meta.approvedAt ?? null,
    photoUrl: r.photo_url ?? meta.photoUrl ?? null,
    cycleName: r.cycle_name ?? meta.cycleName ?? null,
  };
};

function isArchivedCycleRow(removalReason: string | null | undefined): boolean {
  return Boolean(removalReason && String(removalReason).startsWith(ARCHIVED_PREFIX));
}

export function generateDefaultAgreementTerms(data: {
  fullName: string;
  projectName?: string;
  cycleName?: string;
  initialInvestment: number;
  investmentDate?: string;
  profitSharePercentage: number;
  lossSharePercentage: number;
  customClauses?: string;
}): string {
  const naira = (n: number) => "NGN " + Math.round(n || 0).toLocaleString("en-NG");
  const farmShareProfit = 100 - data.profitSharePercentage;
  const project = data.projectName || "Broiler Production Partnership";
  const cycle = data.cycleName || "Cycle 1";
  const date = data.investmentDate || new Date().toISOString().slice(0, 10);

  return `DIGNITY AGRO FARMS LIMITED
POULTRY CO-FINANCING & EQUITY PARTNERSHIP TERMS AND CONDITIONS

PARTIES:
1. DIGNITY AGRO FARMS LIMITED (RC / Agribusiness), Owerri, Imo State ("Farm Manager" or "Farm")
2. ${data.fullName} ("Co-Financing Partner" or "Partner")

1. PURPOSE & CAPITAL COMMITMENT
The Partner has contributed the capital sum of ${naira(data.initialInvestment)} to co-finance the poultry operations designated as "${project}" under "${cycle}", starting on ${date}. These funds are allocated directly to poultry operational requirements, including day-old chicks/stock procurement, commercial feeding, veterinary medication, brooding utilities, and pen management.

2. TRANSPARENCY & LIVE DIGITAL ACCESS
Dignity Agro Farms provides the Partner with 24/7 digital access to their dedicated Partners Account. The Farm commits to logging daily pen operations (feed intake in kg, stock headcount, mortality counts, average bird weight samplings) and itemizing all operational expenditures, bird sales, and offload revenue in real time.

3. PROFIT SHARING RATIO
Upon completion of cycle bird sales and operational reconciliation:
a) Net Operational Profit is defined as Gross Sales Revenue minus Total Operational Expenses.
b) When the cycle records a Net Operational Profit:
   • The Partner is entitled to ${data.profitSharePercentage}% of the Net Operational Profit.
   • Dignity Agro Farms retains ${farmShareProfit}% of the Net Operational Profit.

4. LOSS RESPONSIBILITY & STRICT CAPITAL LOSS PROTECTION
a) If the cycle incurs a Net Operational Loss due to disease mortality, adverse weather, or severe market drops:
   • The Partner's allocated loss responsibility is ${data.lossSharePercentage}% of the Net Loss.
   • MAXIMUM LOSS CAP: Under no circumstances shall the Partner's loss exceed their initial capital investment of ${naira(data.initialInvestment)}. The Partner shall bear zero debt, negative balance, or further liability beyond their capital.
   • Any loss beyond the Partner's capital is absorbed entirely by Dignity Agro Farms.

5. SETTLEMENT & PAYOUT DISBURSEMENT
Within five (5) to seven (7) business days following final bird offload, sales reconciliation, and cycle closure, the Partner's final settlement (Capital adjusted for agreed profit or loss, minus any interim payouts received) shall be disbursed to the Partner's verified bank account or rolled over into a subsequent cycle upon mutual election.

6. BIOSECURITY & FARM CARE PROTOCOLS
Dignity Agro Farms undertakes to exercise the highest standards of professional poultry management, biosecurity control, routine vaccination schedules, and sanitary pen maintenance throughout the flock lifecycle.

7. GOVERNING LAW & AMICABLE SETTLEMENT
This Agreement is governed by the laws of Imo State and the Federal Republic of Nigeria. In the event of any dispute, the parties agree to resolve differences through good-faith mutual consultation and amicable mediation.${data.customClauses ? `\n\nADDITIONAL AGREED TERMS & CLAUSES:\n${data.customClauses.trim()}` : ""}`;
}

function extractPartnerArchivesAndElection(p: any): {
  archivedCycles: PartnerCycleArchive[];
  payoutElection: PartnerPayoutElection | null;
  visibleAuditLog: PartnerAuditEvent[];
} {
  const rawHistory: PartnerAuditEvent[] = Array.isArray(p.terms_history) ? p.terms_history : [];
  let archivedCycles: PartnerCycleArchive[] = Array.isArray(p.archived_cycles) ? p.archived_cycles : [];
  let payoutElection: PartnerPayoutElection | null = p.payout_election ?? null;

  // Fallback extraction from terms_history if native columns aren't populated yet
  const archiveEvents = rawHistory.filter((e) => e.kind === "cycle_archive_data" && e.meta);
  if (archivedCycles.length === 0 && archiveEvents.length > 0) {
    archivedCycles = archiveEvents.map((e) => e.meta as PartnerCycleArchive);
  }

  if (!payoutElection) {
    const electionEvents = rawHistory.filter((e) => e.kind === "payout_election" && e.meta);
    if (electionEvents.length > 0) {
      payoutElection = electionEvents[electionEvents.length - 1].meta as PartnerPayoutElection;
    }
  }

  const visibleAuditLog = rawHistory.filter((e) => e.kind !== "cycle_archive_data");
  return { archivedCycles, payoutElection, visibleAuditLog };
}

function mapPartner(p: any, finRows: any[], actRows: any[] = []): FarmPartner {
  const initial = Number(p.initial_investment) || 0;
  const profitPct = Number(p.profit_share_percentage ?? 50);
  const lossPct = Number(p.loss_share_percentage ?? 100);

  const mappedFins = finRows.map(mapFin).filter((f) => !isArchivedCycleRow(f.removalReason));
  const mappedActs = actRows.map(mapAct).filter((a) => !isArchivedCycleRow(a.removalReason));

  // Only approved entries affect live settlement calculations
  const approvedFins = mappedFins.filter((f) => f.approvalStatus === "approved");
  const pendingCount =
    mappedFins.filter((f) => f.approvalStatus === "pending_approval" && !f.removedAt).length +
    mappedActs.filter((a) => a.approvalStatus === "pending_approval" && !a.removedAt).length;

  const settlement = computeSettlement(
    { initialInvestment: initial, profitSharePercentage: profitPct, lossSharePercentage: lossPct },
    approvedFins.map((r) => ({ type: r.type, amount: Number(r.amount) || 0, removedAt: r.removedAt ?? null })),
  );

  const { archivedCycles, payoutElection, visibleAuditLog } = extractPartnerArchivesAndElection(p);

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
    auditLog: visibleAuditLog,
    agreementTerms: p.agreed_terms ?? p.agreement_terms ?? null,
    agreementSigned: Boolean(p.agreement_signed),
    agreementSignedAt: p.agreement_signed_at ?? null,
    agreementSignedBy: p.agreement_signed_by ?? null,
    agreementSignatureData: p.agreement_signature_data ?? null,
    agreementDocumentUrl: p.agreement_document_url ?? null,
    agreementDocumentName: p.agreement_document_name ?? null,
    agreementDocumentSize: p.agreement_document_size ?? null,
    agreementDocumentUploadedAt: p.agreement_document_uploaded_at ?? null,
    agreementDocumentUploadedBy: p.agreement_document_uploaded_by ?? null,
    archivedCycles,
    payoutElection,
    pendingApprovalsCount: pendingCount,
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

  const partner = mapPartner(p, finRows || [], actRows || []);
  const financials = (finRows || []).map(mapFin).filter((f) => !isArchivedCycleRow(f.removalReason));
  const activities = (actRows || []).map(mapAct).filter((a) => !isArchivedCycleRow(a.removalReason));
  return { partner, financials, activities, raw: p };
}

function buildSummaryAndCharts(
  financials: PartnerFinancial[],
  activities: PartnerActivity[],
  initialInvestment = 0,
): { summary: PartnerDashboardSummary; charts: PartnerChartData } {
  const approvedFins = financials.filter((f) => f.approvalStatus === "approved" && !f.removedAt);
  const approvedActs = activities.filter((a) => a.approvalStatus === "approved" && !a.removedAt);

  const pendingApprovalsCount =
    financials.filter((f) => f.approvalStatus === "pending_approval" && !f.removedAt).length +
    activities.filter((a) => a.approvalStatus === "pending_approval" && !a.removedAt).length;

  const stocked = approvedActs.reduce((s, a) => s + a.stockHeadcount, 0);
  const mortality = approvedActs.reduce((s, a) => s + a.mortalityCount, 0);
  const feed = approvedActs.reduce((s, a) => s + a.feedConsumedKg, 0);
  const currentStockCount = Math.max(0, stocked - mortality);

  // Latest recorded average bird weight (sorted descending by activityDate/createdAt)
  const weightRecord = approvedActs.find((a) => a.averageWeightKg > 0);
  const latestAverageWeightKg = weightRecord ? Number(weightRecord.averageWeightKg) : 0;
  const estimatedBiomassKg = Math.round(currentStockCount * latestAverageWeightKg * 10) / 10;

  const fcr =
    estimatedBiomassKg > 0 && feed > 0 ? Math.round((feed / estimatedBiomassKg) * 100) / 100 : null;

  const totalExpenses = approvedFins
    .filter((f) => f.type === "expense")
    .reduce((sum, f) => sum + f.amount, 0);
  const totalSales = approvedFins
    .filter((f) => f.type === "income")
    .reduce((sum, f) => sum + f.amount, 0);

  const costPerLiveBird =
    currentStockCount > 0 && totalExpenses > 0 ? Math.round(totalExpenses / currentStockCount) : null;

  // Break-even selling price per remaining live bird to recover total capital/expenses
  const targetRecoveryBase = Math.max(initialInvestment, totalExpenses);
  const remainingToRecover = Math.max(0, targetRecoveryBase - totalSales);
  const breakEvenPricePerBird =
    currentStockCount > 0 && targetRecoveryBase > 0
      ? Math.round(remainingToRecover / currentStockCount)
      : null;

  return {
    summary: {
      initialStockCount: stocked,
      currentStockCount,
      totalFeedConsumedKg: Math.round(feed * 10) / 10,
      totalMortalityCount: mortality,
      mortalityRatePercent: stocked > 0 ? Math.round((mortality / stocked) * 1000) / 10 : 0,
      latestAverageWeightKg,
      estimatedBiomassKg,
      fcr,
      costPerLiveBird,
      breakEvenPricePerBird,
      pendingApprovalsCount,
    },
    charts: buildChartData(
      approvedFins.map((f) => ({
        type: f.type,
        amount: f.amount,
        removedAt: f.removedAt,
        category: f.category,
        transactionDate: f.transactionDate,
      })),
      approvedActs.map((a) => ({
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

// ─── Owner & Manager Admin Server Functions ───────────────────────────────────

export const adminListPartners = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<FarmPartner[]> => {
    await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: partners, error: pErr } = await supabaseAdmin
      .from("farm_partners")
      .select("*, farm_batches(batch_name)")
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    const { data: financials, error: fErr } = await supabaseAdmin
      .from("partner_financials")
      .select("*");
    if (fErr) throw new Error(fErr.message);

    const { data: activities, error: aErr } = await supabaseAdmin
      .from("partner_activities")
      .select("*");
    if (aErr) throw new Error(aErr.message);

    const finByPartner = new Map<string, any[]>();
    for (const f of financials || []) {
      const arr = finByPartner.get(f.partner_id) || [];
      arr.push(f);
      finByPartner.set(f.partner_id, arr);
    }

    const actByPartner = new Map<string, any[]>();
    for (const a of activities || []) {
      const arr = actByPartner.get(a.partner_id) || [];
      arr.push(a);
      actByPartner.set(a.partner_id, arr);
    }

    return (partners || []).map((p: any) =>
      mapPartner(p, finByPartner.get(p.id) || [], actByPartner.get(p.id) || []),
    );
  });

async function computePartnerBatchFeedStats(
  supabaseAdmin: any,
  partner: FarmPartner,
  syncedFinancials: PartnerFinancial[] = [],
) {
  if (!partner.batchId) return null;
  let pct = 100;
  for (const f of syncedFinancials) {
    if (f.referenceNo?.startsWith("BATCH-SYNC-")) {
      const m = (f.description || "").match(/\((\d+(?:\.\d+)?)%\s*batch share\)/i);
      if (m) {
        pct = Number(m[1]);
        break;
      }
    }
  }
  const ratio = Math.max(0.01, Math.min(1, pct / 100));

  const [{ data: finRows }, { data: actRows }] = await Promise.all([
    supabaseAdmin
      .from("farm_financials")
      .select("amount, feed_bags, transaction_date, approval_status")
      .eq("batch_id", partner.batchId)
      .eq("type", "expense")
      .ilike("category", "%feed%"),
    supabaseAdmin
      .from("farm_activities")
      .select("activity_date, feed_bag_no, feed_bag_status, feed_bags_used, approval_status")
      .eq("batch_id", partner.batchId)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  let rawBagsBought = 0;
  let totalFeedSpend = 0;
  for (const r of finRows || []) {
    if (r.approval_status && r.approval_status !== "approved") continue;
    if (partner.cycleStartDate && r.transaction_date < partner.cycleStartDate) continue;
    totalFeedSpend += Number(r.amount || 0);
    rawBagsBought += Number(r.feed_bags || 0);
  }

  let rawBagsFinished = 0;
  let currentOpenBagNo: number | null = null;
  let foundLatest = false;
  for (const a of actRows || []) {
    if (a.approval_status && a.approval_status !== "approved") continue;
    if (partner.cycleStartDate && a.activity_date < partner.cycleStartDate) continue;
    if (a.feed_bag_no && a.feed_bag_status) {
      const cumUsed =
        a.feed_bags_used !== null && a.feed_bags_used !== undefined
          ? Number(a.feed_bags_used)
          : a.feed_bag_status === "finished"
            ? Number(a.feed_bag_no)
            : Math.max(0, Number(a.feed_bag_no) - 1);
      if (cumUsed > rawBagsFinished) rawBagsFinished = cumUsed;
      if (!foundLatest) {
        foundLatest = true;
        if (a.feed_bag_status === "opened") currentOpenBagNo = Number(a.feed_bag_no);
      }
    }
  }

  if (rawBagsBought <= 0 && rawBagsFinished <= 0 && !currentOpenBagNo) return null;

  const bagsBought = Math.round(rawBagsBought * ratio * 10) / 10;
  const bagsFinished = Math.round(rawBagsFinished * ratio * 10) / 10;
  const bagsInStock = Math.max(0, Math.round((bagsBought - bagsFinished) * 10) / 10);
  const avgCostPerBag = rawBagsBought > 0 ? Math.round((totalFeedSpend / rawBagsBought) * 100) / 100 : 0;

  return {
    bagsBought,
    bagsFinished,
    currentOpenBagNo,
    bagsInStock,
    avgCostPerBag,
  };
}

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
      summary: PartnerDashboardSummary;
      viewerRole: "owner" | "manager";
    }> => {
      const { role } = await checkOwnerOrManager(data.passcode);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { partner, financials, activities } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
      const computed = buildSummaryAndCharts(financials, activities, partner.initialInvestment);
      const feedBagStats = await computePartnerBatchFeedStats(supabaseAdmin, partner, financials).catch(() => null);
      return {
        partner,
        financials,
        activities,
        summary: { ...computed.summary, feedBagStats },
        charts: computed.charts,
        viewerRole: role,
      };
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
    const terms =
      data.agreedTerms?.trim() ||
      generateDefaultAgreementTerms({
        fullName: data.fullName,
        projectName: data.projectName,
        cycleName: data.cycleName,
        initialInvestment: data.initialInvestment,
        investmentDate: data.investmentDate,
        profitSharePercentage: data.profitSharePercentage,
        lossSharePercentage: data.lossSharePercentage,
      });

    const insertPayload: Record<string, any> = {
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
      agreed_terms: terms,
      project_name: data.projectName,
      cycle_name: data.cycleName,
      cycle_start_date: data.cycleStartDate,
      cycle_end_date: data.cycleEndDate || null,
      cycle_status: "open",
      batch_id: data.batchId || null,
      status: "active",
      active: true,
    };

    let insertedId: string | null = null;
    let lastError: any = null;

    // Schema-resilient insert loop: automatically prunes any column missing in older DB schemas
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: inserted, error } = await supabaseAdmin
        .from("farm_partners")
        .insert(insertPayload)
        .select("id")
        .single();

      if (!error && inserted) {
        insertedId = inserted.id;
        break;
      }

      lastError = error;
      const match = error?.message?.match(/Could not find the '([^']+)' column of 'farm_partners'/i);
      if (match && match[1] && match[1] in insertPayload) {
        delete insertPayload[match[1]];
        continue;
      }
      break;
    }

    if (!insertedId) throw new Error(lastError?.message || "Failed to create partner account");
    return { ok: true, partnerId: insertedId };
  });

export const adminUpdatePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        fullName: z.string().trim().min(2),
        phone: z.string().trim().min(7),
        email: z.string().trim().email().optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
        address: z.string().trim().optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
        initialInvestment: z.number().min(0),
        investmentDate: dateStr,
        profitSharePercentage: pct,
        lossSharePercentage: pct,
        agreedTerms: z.string().trim().optional().nullable(),
        projectName: z.string().trim().min(2),
        cycleName: z.string().trim().min(2),
        cycleStartDate: dateStr,
        cycleEndDate: dateStr.optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
        batchId: z.string().uuid().optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
        status: z.enum(["active", "matured", "completed", "paused"]),
        amendReason: z.string().trim().max(500).optional().nullable(),
        newPassword: z.string().trim().min(6).optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
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
      const effectiveAmendReason = data.amendReason?.trim() || "Terms and details updated by farm owner";
      auditLog.push({
        at: new Date().toISOString(),
        by: cred.username || "owner",
        kind: "terms_amended",
        reason: effectiveAmendReason,
        from: { profit: oldProfit, loss: oldLoss },
        to: { profit: data.profitSharePercentage, loss: data.lossSharePercentage },
      });
    }

    const updatePayload: Record<string, any> = {
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
    };

    if (data.newPassword) {
      updatePayload.passcode_hash = await hashPasscode(data.newPassword);
    }

    let lastError: any = null;
    let updated = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabaseAdmin
        .from("farm_partners")
        .update(updatePayload)
        .eq("id", data.partnerId);

      if (!error) {
        updated = true;
        break;
      }

      lastError = error;
      const match = error?.message?.match(/Could not find the '([^']+)' column of 'farm_partners'/i);
      if (match && match[1] && match[1] in updatePayload) {
        delete updatePayload[match[1]];
        continue;
      }
      break;
    }

    if (!updated) throw new Error(lastError?.message || "Failed to update partner details");
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

// ─── Multi-Cycle Rollover (Archive Current Cycle & Start New Cycle for Partner) ─

export const adminRolloverPartnerCycle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        newCycleName: z.string().trim().min(2, "New cycle name is required"),
        newProjectName: z.string().trim().min(2, "Project name is required"),
        newInitialInvestment: z.number().min(0, "Investment amount cannot be negative"),
        newProfitSharePercentage: pct,
        newLossSharePercentage: pct,
        newCycleStartDate: dateStr,
        newCycleEndDate: dateStr.optional().nullable(),
        newBatchId: z.string().uuid().optional().nullable(),
        rolloverNotes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

    if (data.newCycleEndDate && data.newCycleEndDate < data.newCycleStartDate) {
      throw new Error("Cycle end date cannot be before the start date.");
    }

    const { partner, financials, activities, raw } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
    const { summary } = buildSummaryAndCharts(financials, activities, partner.initialInvestment);
    const now = new Date().toISOString();
    const cycleId = `cycle_${Date.now()}`;

    const archiveEntry: PartnerCycleArchive = {
      cycleId,
      cycleName: partner.cycleName,
      projectName: partner.projectName,
      batchId: partner.batchId,
      batchName: partner.batchName ?? null,
      initialInvestment: partner.initialInvestment,
      profitSharePercentage: partner.profitSharePercentage,
      lossSharePercentage: partner.lossSharePercentage,
      cycleStartDate: partner.cycleStartDate,
      cycleEndDate: partner.cycleEndDate,
      settledAt: partner.settledAt || now,
      settledBy: cred.username || "owner",
      settlement: partner.settlement,
      summary,
      financials,
      activities,
      agreementSigned: partner.agreementSigned,
      agreementSignedAt: partner.agreementSignedAt,
      agreementSignedBy: partner.agreementSignedBy,
    };

    const existingArchives = [...partner.archivedCycles, archiveEntry];
    const rawHistory: PartnerAuditEvent[] = Array.isArray(raw.terms_history) ? [...raw.terms_history] : [];

    // Store archive both in terms_history fallback and in archived_cycles column
    rawHistory.push({
      at: now,
      by: cred.username || "owner",
      kind: "cycle_archive_data",
      reason: `Archived ${partner.cycleName}`,
      meta: archiveEntry,
    });
    rawHistory.push({
      at: now,
      by: cred.username || "owner",
      kind: "cycle_rollover",
      reason:
        data.rolloverNotes ||
        `Rolled over from ${partner.cycleName} to ${data.newCycleName} with capital ₦${Math.round(data.newInitialInvestment).toLocaleString("en-NG")}`,
      from: { profit: partner.profitSharePercentage, loss: partner.lossSharePercentage },
      to: { profit: data.newProfitSharePercentage, loss: data.newLossSharePercentage },
    });

    // Soft-archive current cycle's financials and activities so the new cycle starts with a clean ledger
    const archiveTag = `${ARCHIVED_PREFIX}${cycleId}:${partner.cycleName}`;
    await supabaseAdmin
      .from("partner_financials")
      .update({
        removed_at: now,
        removed_by: cred.username || "owner",
        removal_reason: archiveTag,
      })
      .eq("partner_id", data.partnerId)
      .is("removed_at", null);

    await supabaseAdmin
      .from("partner_activities")
      .update({
        removed_at: now,
        removed_by: cred.username || "owner",
        removal_reason: archiveTag,
      })
      .eq("partner_id", data.partnerId)
      .is("removed_at", null);

    const newTerms = generateDefaultAgreementTerms({
      fullName: partner.fullName,
      projectName: data.newProjectName,
      cycleName: data.newCycleName,
      initialInvestment: data.newInitialInvestment,
      investmentDate: data.newCycleStartDate,
      profitSharePercentage: data.newProfitSharePercentage,
      lossSharePercentage: data.newLossSharePercentage,
    });

    const baseUpdate: Record<string, any> = {
      cycle_name: data.newCycleName,
      project_name: data.newProjectName,
      initial_investment: data.newInitialInvestment,
      investment_date: data.newCycleStartDate,
      profit_share_percentage: data.newProfitSharePercentage,
      loss_share_percentage: data.newLossSharePercentage,
      cycle_start_date: data.newCycleStartDate,
      cycle_end_date: data.newCycleEndDate || null,
      batch_id: data.newBatchId || null,
      cycle_status: "open",
      status: "active",
      settled_at: null,
      settlement_snapshot: null,
      agreed_terms: newTerms,
      agreement_signed: false,
      agreement_signed_at: null,
      agreement_signed_by: null,
      agreement_signature_data: null,
      terms_history: rawHistory,
      updated_at: now,
    };

    const { error: fullErr } = await supabaseAdmin
      .from("farm_partners")
      .update({
        ...baseUpdate,
        archived_cycles: existingArchives,
        payout_election: null,
      })
      .eq("id", data.partnerId);

    if (fullErr) {
      // Fallback if archived_cycles / payout_election columns aren't migrated yet
      const { error: fallbackErr } = await supabaseAdmin
        .from("farm_partners")
        .update(baseUpdate)
        .eq("id", data.partnerId);
      if (fallbackErr) throw new Error(fallbackErr.message);
    }

    return { ok: true, archivedCycleId: cycleId };
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

    // Clean up all related financial entries and activity logs first
    await supabaseAdmin.from("partner_financials").delete().eq("partner_id", data.partnerId);
    await supabaseAdmin.from("partner_activities").delete().eq("partner_id", data.partnerId);

    const { error } = await supabaseAdmin.from("farm_partners").delete().eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Financial Entry Recording (Owner -> Approved, Manager -> Pending Approval) ─

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
        receiptUrl: z.string().trim().optional().nullable(),
        attachmentName: z.string().trim().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { role, username } = await checkOwnerOrManager(data.passcode);
    if (data.type === "payout" && role !== "owner") {
      throw new Error("Only the Farm Owner can record partner payouts.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

    const now = new Date().toISOString();
    const approvalStatus = role === "owner" ? "approved" : "pending_approval";
    const packedDescription = packTextWithMeta(data.description, {
      approvalStatus,
      approvedBy: role === "owner" ? username : null,
      approvedAt: role === "owner" ? now : null,
      receiptUrl: data.receiptUrl || null,
      attachmentName: data.attachmentName || null,
      cycleName: partner.cycleName,
    });

    const baseRow = {
      partner_id: data.partnerId,
      batch_id: data.batchId || partner.batchId || null,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: packedDescription,
      payment_method: data.paymentMethod,
      transaction_date: data.transactionDate,
      reference_no: data.referenceNo || null,
      recorded_by: username,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("partner_financials")
      .insert({
        ...baseRow,
        approval_status: approvalStatus,
        approved_by: role === "owner" ? username : null,
        approved_at: role === "owner" ? now : null,
        receipt_url: data.receiptUrl || null,
        attachment_name: data.attachmentName || null,
        cycle_name: partner.cycleName,
      })
      .select("id")
      .single();

    if (error) {
      const { data: fallbackInserted, error: fallbackErr } = await supabaseAdmin
        .from("partner_financials")
        .insert(baseRow)
        .select("id")
        .single();
      if (fallbackErr) throw new Error(fallbackErr.message);
      return { ok: true, id: fallbackInserted.id, approvalStatus };
    }

    return { ok: true, id: inserted.id, approvalStatus };
  });

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

// ─── Activity Recording (Owner -> Approved, Manager -> Pending Approval) ──────

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
        photoUrl: z.string().trim().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { role, username } = await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertCycleOpen(supabaseAdmin, data.partnerId);

    const { partner } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
    const now = new Date().toISOString();
    const approvalStatus = role === "owner" ? "approved" : "pending_approval";
    const packedNotes = packTextWithMeta(data.notes || "", {
      approvalStatus,
      approvedBy: role === "owner" ? username : null,
      approvedAt: role === "owner" ? now : null,
      photoUrl: data.photoUrl || null,
      cycleName: partner.cycleName,
    });

    const baseRow = {
      partner_id: data.partnerId,
      batch_id: data.batchId || partner.batchId || null,
      activity_date: data.activityDate,
      activity_type: data.activityType,
      stock_headcount: data.stockHeadcount,
      mortality_count: data.mortalityCount,
      cause_of_mortality: data.causeOfMortality || null,
      feed_consumed_kg: data.feedConsumedKg,
      average_weight_kg: data.averageWeightKg,
      notes: packedNotes || null,
      recorded_by: username,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("partner_activities")
      .insert({
        ...baseRow,
        approval_status: approvalStatus,
        approved_by: role === "owner" ? username : null,
        approved_at: role === "owner" ? now : null,
        photo_url: data.photoUrl || null,
        cycle_name: partner.cycleName,
      })
      .select("id")
      .single();

    if (error) {
      const { data: fallbackInserted, error: fallbackErr } = await supabaseAdmin
        .from("partner_activities")
        .insert(baseRow)
        .select("id")
        .single();
      if (fallbackErr) throw new Error(fallbackErr.message);
      return { ok: true, id: fallbackInserted.id, approvalStatus };
    }

    return { ok: true, id: inserted.id, approvalStatus };
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

// ─── Owner Approval Gate for Manager-Submitted Partner Records ────────────────

export const adminDecidePartnerRecordApproval = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        recordType: z.enum(["financial", "activity"]),
        recordId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        rejectionReason: z.string().trim().max(300).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);
    const now = new Date().toISOString();
    const approver = cred.username || "owner";

    if (data.recordType === "financial") {
      const { data: row } = await supabaseAdmin
        .from("partner_financials")
        .select("*")
        .eq("id", data.recordId)
        .single();
      if (!row) throw new Error("Financial entry not found.");

      const { cleanText, meta } = unpackTextAndMeta(row.description);
      const updatedDesc = packTextWithMeta(cleanText || "", {
        ...meta,
        approvalStatus: data.decision,
        approvedBy: approver,
        approvedAt: now,
      });

      const baseUpdate: Record<string, any> = {
        description: updatedDesc,
        ...(data.decision === "rejected"
          ? {
              removed_at: now,
              removed_by: approver,
              removal_reason: data.rejectionReason || "Rejected by Owner during review",
            }
          : {}),
      };

      const { error } = await supabaseAdmin
        .from("partner_financials")
        .update({
          ...baseUpdate,
          approval_status: data.decision,
          approved_by: approver,
          approved_at: now,
        })
        .eq("id", data.recordId);

      if (error) {
        const { error: fErr } = await supabaseAdmin
          .from("partner_financials")
          .update(baseUpdate)
          .eq("id", data.recordId);
        if (fErr) throw new Error(fErr.message);
      }
    } else {
      const { data: row } = await supabaseAdmin
        .from("partner_activities")
        .select("*")
        .eq("id", data.recordId)
        .single();
      if (!row) throw new Error("Activity log not found.");

      const { cleanText, meta } = unpackTextAndMeta(row.notes);
      const updatedNotes = packTextWithMeta(cleanText || "", {
        ...meta,
        approvalStatus: data.decision,
        approvedBy: approver,
        approvedAt: now,
      });

      const baseUpdate: Record<string, any> = {
        notes: updatedNotes,
        ...(data.decision === "rejected"
          ? {
              removed_at: now,
              removed_by: approver,
              removal_reason: data.rejectionReason || "Rejected by Owner during review",
            }
          : {}),
      };

      const { error } = await supabaseAdmin
        .from("partner_activities")
        .update({
          ...baseUpdate,
          approval_status: data.decision,
          approved_by: approver,
          approved_at: now,
        })
        .eq("id", data.recordId);

      if (error) {
        const { error: fErr } = await supabaseAdmin
          .from("partner_activities")
          .update(baseUpdate)
          .eq("id", data.recordId);
        if (fErr) throw new Error(fErr.message);
      }
    }

    return { ok: true };
  });

// ─── 1-Click Farm Batch -> Partner Log Synchronization ────────────────────────

export const adminSyncBatchToPartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        allocationPercentage: z.number().min(1).max(100).default(100),
        syncFinancials: z.boolean().default(true),
        syncActivities: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { role, username } = await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { partner, financials, activities } = await loadPartnerBundle(supabaseAdmin, data.partnerId);
    if (!partner.batchId) {
      throw new Error("This partner is not linked to a Farm Batch yet. Link a batch in Partner Settings first.");
    }
    if (partner.cycleStatus === "closed") {
      throw new Error("Cannot sync into a closed cycle.");
    }

    const ratio = data.allocationPercentage / 100;
    const approvalStatus = role === "owner" ? "approved" : "pending_approval";
    const now = new Date().toISOString();

    let importedFinancials = 0;
    let importedActivities = 0;

    if (data.syncFinancials) {
      const { data: batchFins } = await supabaseAdmin
        .from("farm_financials")
        .select("*")
        .eq("batch_id", partner.batchId)
        .order("transaction_date", { ascending: true });

      const existingRefs = new Set(
        financials.map((f) => f.referenceNo).filter(Boolean),
      );

      for (const bf of batchFins || []) {
        if (bf.approval_status && bf.approval_status !== "approved") continue;
        const syncRef = `BATCH-SYNC-${String(bf.id).slice(0, 8)}`;
        if (existingRefs.has(syncRef)) continue;
        if (partner.cycleStartDate && bf.transaction_date < partner.cycleStartDate) continue;

        const effectiveAmount =
          bf.type === "income" && bf.amount_paid !== null && bf.amount_paid !== undefined
            ? Number(bf.amount_paid)
            : Number(bf.amount || 0);
        const scaledAmount = Math.round(effectiveAmount * ratio * 100) / 100;
        if (scaledAmount <= 0) continue;

        const bagCountLabel =
          Number(bf.feed_bags || 0) > 0
            ? ` · ${Math.round(Number(bf.feed_bags) * ratio * 10) / 10} bags${bf.feed_brand ? ` (${bf.feed_brand})` : ""}`
            : "";
        const descBase =
          data.allocationPercentage < 100
            ? `${bf.description}${bagCountLabel} (${data.allocationPercentage}% batch share)`
            : `${bf.description}${bagCountLabel}`;

        const packedDesc = packTextWithMeta(descBase, {
          approvalStatus,
          approvedBy: role === "owner" ? username : null,
          approvedAt: role === "owner" ? now : null,
          cycleName: partner.cycleName,
        });

        const baseRow = {
          partner_id: partner.id,
          batch_id: partner.batchId,
          type: bf.type === "income" ? "income" : "expense",
          category: bf.category || "Batch Operations",
          amount: scaledAmount,
          description: packedDesc,
          payment_method: bf.payment_method || "Bank Transfer",
          transaction_date: bf.transaction_date,
          reference_no: syncRef,
          recorded_by: username,
        };

        const { error } = await supabaseAdmin.from("partner_financials").insert({
          ...baseRow,
          approval_status: approvalStatus,
          approved_by: role === "owner" ? username : null,
          approved_at: role === "owner" ? now : null,
          cycle_name: partner.cycleName,
        });
        if (error) {
          await supabaseAdmin.from("partner_financials").insert(baseRow);
        }
        importedFinancials++;
      }
    }

    if (data.syncActivities) {
      const { data: batchActs } = await supabaseAdmin
        .from("farm_activities")
        .select("*")
        .eq("batch_id", partner.batchId)
        .order("activity_date", { ascending: true });

      const existingSyncTags = new Set(
        activities
          .map((a) => {
            const m = (a.notes || "").match(/\[SYNC:([a-z0-9-]+)\]/i);
            return m ? m[1] : null;
          })
          .filter(Boolean),
      );

      for (const ba of batchActs || []) {
        if (ba.approval_status && ba.approval_status !== "approved") continue;
        const shortId = String(ba.id).slice(0, 8);
        if (existingSyncTags.has(shortId)) continue;
        if (partner.cycleStartDate && ba.activity_date < partner.cycleStartDate) continue;

        const isDailyLog = ba.activity_type === "Daily Log";
        const mappedType: PartnerActivity["activityType"] = isDailyLog
          ? Number(ba.feed_consumed_kg || 0) > 0
            ? "Feeding"
            : Number(ba.mortality_count || 0) > 0
              ? "Mortality Record"
              : "General Note"
          : ba.activity_type === "Feeding" ||
              ba.activity_type === "Mortality Record" ||
              ba.activity_type === "Weight Check" ||
              ba.activity_type === "Medication / Vaccination" ||
              ba.activity_type === "Cleaning & Sanitation"
            ? ba.activity_type
            : "General Note";

        const dailyBits: string[] = [];
        if (ba.feed_bag_no && ba.feed_bag_status) {
          dailyBits.push(`Bag #${ba.feed_bag_no} ${ba.feed_bag_status === "finished" ? "Finished" : "Opened"}`);
        }
        if (isDailyLog) {
          if (Number(ba.sick_count || 0) > 0) dailyBits.push(`Sick: ${ba.sick_count}`);
          if (ba.feed_brand) dailyBits.push(`Feed: ${ba.feed_brand}`);
          if (ba.water_given) dailyBits.push("Water ✓");
          if (ba.temperature) dailyBits.push(`Temp: ${ba.temperature}`);
        }
        const baseNote = ba.notes || (isDailyLog ? "Daily log" : ba.activity_type);
        const noteText = `${baseNote}${dailyBits.length ? ` · ${dailyBits.join(" · ")}` : ""}${ba.medication_given ? ` · Med: ${ba.medication_given}` : ""} [SYNC:${shortId}]`;
        const packedNotes = packTextWithMeta(noteText, {
          approvalStatus,
          approvedBy: role === "owner" ? username : null,
          approvedAt: role === "owner" ? now : null,
          cycleName: partner.cycleName,
        });

        const baseRow = {
          partner_id: partner.id,
          batch_id: partner.batchId,
          activity_date: ba.activity_date,
          activity_type: mappedType,
          stock_headcount: 0,
          mortality_count: Math.round(Number(ba.mortality_count || 0) * ratio),
          cause_of_mortality: ba.cause_of_mortality || null,
          feed_consumed_kg: Math.round(Number(ba.feed_consumed_kg || 0) * ratio * 10) / 10,
          average_weight_kg: 0,
          notes: packedNotes,
          recorded_by: username,
        };

        const { error } = await supabaseAdmin.from("partner_activities").insert({
          ...baseRow,
          approval_status: approvalStatus,
          approved_by: role === "owner" ? username : null,
          approved_at: role === "owner" ? now : null,
          cycle_name: partner.cycleName,
        });
        if (error) {
          await supabaseAdmin.from("partner_activities").insert(baseRow);
        }
        importedActivities++;
      }
    }

    return {
      ok: true,
      importedFinancials,
      importedActivities,
      approvalStatus,
    };
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

    const { partner, financials, activities } = await loadPartnerBundle(supabaseAdmin, session.pid);
    if (!partner.active) {
      throw new Error("Your partner account is inactive. Contact Dignity Agro Farms administration.");
    }

    // Partners ONLY see approved entries; pending_approval or rejected entries from managers never leak!
    const approvedFinancials = financials.filter((f) => f.approvalStatus === "approved");
    const approvedActivities = activities.filter((a) => a.approvalStatus === "approved");

    const MASK = "Farm Management";
    const maskedPartner: FarmPartner = {
      ...partner,
      auditLog: partner.auditLog.map((e) => ({
        ...e,
        by: e.kind === "agreement_signed" || e.kind === "payout_election" ? e.by : MASK,
      })),
    };
    const maskedFin = approvedFinancials.map((f) => ({
      ...f,
      recordedBy: f.recordedBy ? MASK : null,
      removedBy: f.removedBy ? MASK : null,
      approvedBy: f.approvedBy ? MASK : null,
    }));
    const maskedAct = approvedActivities.map((a) => ({
      ...a,
      recordedBy: a.recordedBy ? MASK : null,
      removedBy: a.removedBy ? MASK : null,
      approvedBy: a.approvedBy ? MASK : null,
    }));

    const computed = buildSummaryAndCharts(approvedFinancials, approvedActivities, partner.initialInvestment);
    const feedBagStats = await computePartnerBatchFeedStats(supabaseAdmin, partner, approvedFinancials).catch(() => null);

    return {
      partner: maskedPartner,
      financials: maskedFin,
      activities: maskedAct,
      summary: { ...computed.summary, feedBagStats },
      charts: computed.charts,
    };
  });

export const partnerSubmitCycleElection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        choice: z.enum(["bank_payout", "rollover_principal", "rollover_all"]),
        bankName: z.string().trim().max(120).optional().nullable(),
        accountNumber: z.string().trim().max(30).optional().nullable(),
        accountName: z.string().trim().max(120).optional().nullable(),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const session = await verifySession(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.choice === "bank_payout" && (!data.bankName || !data.accountNumber || !data.accountName)) {
      throw new Error("Please provide your Bank Name, Account Number, and Account Name for payout disbursement.");
    }

    const { data: partner, error: pErr } = await supabaseAdmin
      .from("farm_partners")
      .select("id, full_name, terms_history")
      .eq("id", session.pid)
      .single();
    if (pErr || !partner) throw new Error("Partner record not found.");

    const now = new Date().toISOString();
    const election: PartnerPayoutElection = {
      choice: data.choice,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      accountName: data.accountName || null,
      notes: data.notes || null,
      submittedAt: now,
      status: "pending_review",
    };

    const choiceLabel =
      data.choice === "bank_payout"
        ? `Bank Payout Requested (${data.bankName} · ${data.accountNumber})`
        : data.choice === "rollover_principal"
          ? "Rollover Principal into Next Cycle (Payout Profit)"
          : "Full Rollover (Principal + Profit) into Next Cycle";

    const history: PartnerAuditEvent[] = Array.isArray(partner.terms_history) ? [...partner.terms_history] : [];
    history.push({
      at: now,
      by: partner.full_name,
      kind: "payout_election",
      reason: choiceLabel,
      meta: election,
    });

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        payout_election: election,
        terms_history: history,
        updated_at: now,
      })
      .eq("id", partner.id);

    if (error) {
      const { error: fErr } = await supabaseAdmin
        .from("farm_partners")
        .update({
          terms_history: history,
          updated_at: now,
        })
        .eq("id", partner.id);
      if (fErr) throw new Error(fErr.message);
    }

    return { ok: true, election };
  });

export const partnerSignAgreement = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        legalName: z.string().trim().min(2, "Full legal name is required to sign"),
        signatureData: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const session = await verifySession(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: partner, error: pErr } = await supabaseAdmin
      .from("farm_partners")
      .select("id, full_name, terms_history, agreement_signed")
      .eq("id", session.pid)
      .single();

    if (pErr || !partner) throw new Error("Partner record not found.");

    const now = new Date().toISOString();
    const history = Array.isArray(partner.terms_history) ? partner.terms_history : [];
    const event: PartnerAuditEvent = {
      at: now,
      by: data.legalName,
      kind: "agreement_signed",
      reason: "Partner digitally reviewed and signed Terms & Conditions on the portal",
    };

    const { error: uErr } = await supabaseAdmin
      .from("farm_partners")
      .update({
        agreement_signed: true,
        agreement_signed_at: now,
        agreement_signed_by: data.legalName,
        agreement_signature_data: data.signatureData || null,
        terms_history: [...history, event],
      })
      .eq("id", partner.id);

    if (uErr) throw new Error(uErr.message);
    return { ok: true, signedAt: now, signedBy: data.legalName };
  });

export const partnerUploadWrittenAgreement = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        fileUrl: z.string().trim().min(1, "File link or attachment data is required"),
        fileName: z.string().trim().min(1, "File name is required"),
        fileSize: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const session = await verifySession(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        agreement_document_url: data.fileUrl,
        agreement_document_name: data.fileName,
        agreement_document_size: data.fileSize || "Attachment",
        agreement_document_uploaded_at: now,
        agreement_document_uploaded_by: "Partner",
      })
      .eq("id", session.pid);

    if (error) throw new Error(error.message);
    return { ok: true, uploadedAt: now };
  });

export const adminUploadPartnerDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        fileUrl: z.string().trim().min(1, "File link or attachment data is required"),
        fileName: z.string().trim().min(1, "File name is required"),
        fileSize: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        agreement_document_url: data.fileUrl,
        agreement_document_name: data.fileName,
        agreement_document_size: data.fileSize || "Attachment",
        agreement_document_uploaded_at: now,
        agreement_document_uploaded_by: "Owner / Management",
      })
      .eq("id", data.partnerId);

    if (error) throw new Error(error.message);
    return { ok: true, uploadedAt: now };
  });

export const adminDeletePartnerDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        agreement_document_url: null,
        agreement_document_name: null,
        agreement_document_size: null,
        agreement_document_uploaded_at: null,
        agreement_document_uploaded_by: null,
      })
      .eq("id", data.partnerId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdatePartnerAgreementTerms = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        terms: z.string().trim().min(10, "Agreement terms must be at least 10 characters"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        agreed_terms: data.terms,
      })
      .eq("id", data.partnerId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Partner System Visibility Controls ─────────────────────────────────────

export const adminGetPartnerSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const role = await checkPasscode(data.passcode);
    if (role !== "owner" && role !== "manager") {
      throw new Error("Access denied.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "hide_partners_from_manager")
      .maybeSingle();

    const hideFromManager = row?.value === "true";
    return { hideFromManager, role };
  });

export const adminSetPartnerManagerVisibility = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string().min(1).max(200),
        hide: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          key: "hide_partners_from_manager",
          value: data.hide ? "true" : "false",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

    if (error) {
      throw new Error(`Failed to update setting: ${error.message}`);
    }
    return { success: true, hideFromManager: data.hide };
  });
