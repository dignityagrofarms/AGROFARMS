import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkPasscode, checkOwner, parseAdminCredential } from "./orders.functions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FarmBatch = {
  id: string;
  batchName: string;
  batchType: string;
  initialHeadcount: number;
  currentHeadcount: number;
  startDate: string;
  targetHarvestDate: string | null;
  status: "active" | "completed" | "archived";
  closedAt?: string | null;
  closedBy?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FarmFinancial = {
  id: string;
  batchId: string | null;
  batchName?: string | null;
  type: "expense" | "income";
  category: string;
  amount: number;
  amountPaid?: number | null;
  balanceDue?: number;
  paymentStatus?: "paid" | "partial" | "unpaid";
  partyName?: string | null;
  dueDate?: string | null;
  description: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNo: string | null;
  feedBags?: number | null;
  feedKgPerBag?: number | null;
  feedBrand?: string | null;
  recordedBy: string | null;
  approvalStatus?: "approved" | "pending_approval" | "rejected";
  rejectionReason?: string | null;
  createdAt: string;
};

export type FarmFinancialPayment = {
  id: string;
  financialId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo: string | null;
  notes: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  recordedBy: string | null;
  createdAt: string;
};

export type PendingFinancialPayment = FarmFinancialPayment & {
  partyName: string | null;
  financialDescription: string;
  financialType: "expense" | "income";
  batchName: string | null;
};

export type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "90_plus";

export type DebtorCreditorItem = {
  id: string;
  source: "farm_financial" | "contact_tx";
  kind: "debtor" | "creditor";
  partyName: string;
  partyPhone: string | null;
  contactId: string | null;
  batchId: string | null;
  batchName: string | null;
  category: string;
  description: string;
  transactionDate: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: "partial" | "unpaid";
  daysOverdue: number;
  agingBucket: AgingBucket;
};

export type DebtorsCreditorsReport = {
  items: DebtorCreditorItem[];
  summary: {
    totalReceivable: number;
    totalPayable: number;
    overdueReceivable: number;
    overduePayable: number;
    debtorCount: number;
    creditorCount: number;
  };
  partyTotals: Array<{
    kind: "debtor" | "creditor";
    partyName: string;
    partyPhone: string | null;
    totalAmount: number;
    totalPaid: number;
    balanceDue: number;
    count: number;
    maxDaysOverdue: number;
  }>;
};

export type LeadCommunication = {
  id: string;
  leadId: string;
  activityType: string;
  messageSummary: string;
  content: string | null;
  sentBy: string | null;
  createdAt: string;
};

export type CrmLead = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  location: string | null;
  leadSource: string;
  interestedIn: string | null;
  status: "New Lead" | "Contacted" | "Interested / Negotiating" | "Converted to Customer" | "Lost / Inactive";
  estimatedValue: number;
  notes: string | null;
  followUpDate: string | null;
  communications?: LeadCommunication[];
  lastContactedAt?: string | null;
  totalMessagesCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type FarmActivity = {
  id: string;
  batchId: string | null;
  batchName?: string | null;
  activityDate: string;
  activityType:
    | "Mortality Record"
    | "Feeding"
    | "Medication / Vaccination"
    | "Weight Check"
    | "Egg Collection"
    | "Cleaning & Sanitation"
    | "Pen Maintenance"
    | "General Activity"
    | "Daily Log";
  mortalityCount: number;
  causeOfMortality: string | null;
  feedConsumedKg: number;
  eggsCollected: number;
  medicationGiven: string | null;
  notes: string | null;
  recordedBy: string | null;
  approvalStatus?: "approved" | "pending_approval" | "rejected";
  rejectionReason?: string | null;
  createdAt: string;
  // Daily Log & Feed Bag tracking fields
  sickCount?: number;
  feedGiven?: boolean | null;
  feedBrand?: string | null;
  feedBagNo?: number | null;
  feedBagStatus?: "opened" | "finished" | null;
  feedBagsUsed?: number | null;
  waterGiven?: boolean | null;
  temperature?: string | null;
};

export type BatchFeedLedger = {
  batchId: string;
  bagsBought: number;
  bagsFinished: number;
  currentOpenBagNo: number | null;
  bagsInStock: number;
  defaultKgPerBag: number;
  totalKgBought: number;
  totalKgUsed: number;
  totalFeedSpend: number;
  avgCostPerBag: number;
  usedFeedValue: number;
  remainingStockValue: number;
  lastEntry: {
    activityDate: string;
    feedBagNo: number;
    feedBagStatus: "opened" | "finished";
    feedBagsUsed: number;
    feedBrand: string | null;
  } | null;
  brandBreakdown: Array<{
    brand: string;
    bagsBought: number;
    spend: number;
  }>;
};

export type PendingContactTransaction = {
  id: string;
  contactId: string;
  contactName: string;
  batchId: string | null;
  batchName: string | null;
  transactionType: string;
  transactionDate: string;
  itemDescription: string;
  totalAmount: number;
  amountPaid: number;
  recordedBy: string | null;
  approvalStatus: "approved" | "pending_approval" | "rejected";
  rejectionReason?: string | null;
  createdAt: string;
};

export type MySubmissionItem = {
  id: string;
  targetType: "financial" | "activity" | "contact_tx";
  title: string;
  subtitle: string;
  date: string;
  batchName: string | null;
  amount: number | null;
  approvalStatus: "approved" | "pending_approval" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
};

export type BatchReport = {
  batch: FarmBatch;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  roiPercentage: number;
  costPerBird: number;
  revenuePerBird: number;
  totalMortality: number;
  mortalityRatePercentage: number;
  totalFeedConsumedKg: number;
  totalEggsCollected: number;
  expenseByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
  financials: FarmFinancial[];
  activities: FarmActivity[];
};

// ─── Input Schemas ────────────────────────────────────────────────────────────

const baseAuthSchema = z.object({
  passcode: z.string().min(1).max(500),
});

const createBatchSchema = baseAuthSchema.extend({
  batchName: z.string().trim().min(2).max(150),
  batchType: z.string().trim().min(1).max(100),
  initialHeadcount: z.number().int().min(0),
  startDate: z.string().trim().min(1),
  targetHarvestDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const updateBatchSchema = baseAuthSchema.extend({
  id: z.string().uuid(),
  batchName: z.string().trim().min(2).max(150),
  batchType: z.string().trim().min(1).max(100),
  initialHeadcount: z.number().int().min(0),
  currentHeadcount: z.number().int().min(0),
  status: z.enum(["active", "completed", "archived"]),
  startDate: z.string().trim().min(1),
  targetHarvestDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const createFinancialSchema = baseAuthSchema.extend({
  batchId: z.string().uuid("Please select an active batch."),
  type: z.enum(["expense", "income"]),
  category: z.string().trim().min(1).max(100),
  amount: z.number().min(0),
  amountPaid: z.number().min(0).optional().nullable(),
  partyName: z.string().trim().max(150).optional().nullable(),
  dueDate: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().min(1).max(500),
  paymentMethod: z.string().trim().min(1).max(100).default("Bank Transfer"),
  transactionDate: z.string().trim().min(1),
  referenceNo: z.string().trim().max(100).optional().nullable(),
  feedBags: z.number().min(0).optional().nullable(),
  feedKgPerBag: z.number().min(1).max(500).optional().nullable(),
  feedBrand: z.string().trim().max(120).optional().nullable(),
});

const createLeadSchema = baseAuthSchema.extend({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().max(150).optional().nullable(),
  location: z.string().trim().max(250).optional().nullable(),
  leadSource: z.string().trim().min(1).max(100).default("WhatsApp"),
  interestedIn: z.string().trim().max(200).optional().nullable(),
  status: z.enum(["New Lead", "Contacted", "Interested / Negotiating", "Converted to Customer", "Lost / Inactive"]).default("New Lead"),
  estimatedValue: z.number().min(0).default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  followUpDate: z.string().trim().optional().nullable(),
});

const updateLeadSchema = createLeadSchema.extend({
  id: z.string().uuid(),
});

const createActivitySchema = baseAuthSchema.extend({
  batchId: z.string().uuid("Please select an active batch."),
  activityDate: z.string().trim().min(1),
  activityType: z.enum([
    "Mortality Record",
    "Feeding",
    "Medication / Vaccination",
    "Weight Check",
    "Egg Collection",
    "Cleaning & Sanitation",
    "Pen Maintenance",
    "General Activity",
    "Daily Log",
  ]),
  mortalityCount: z.number().int().min(0).default(0),
  causeOfMortality: z.string().trim().max(200).optional().nullable(),
  feedConsumedKg: z.number().min(0).default(0),
  eggsCollected: z.number().int().min(0).default(0),
  medicationGiven: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

// ─── Batch Guard Helper ──────────────────────────────────────────────────────

export async function assertBatchOpen(supabaseAdmin: any, batchId: string) {
  const { data: batch, error } = await supabaseAdmin
    .from("farm_batches")
    .select("id, batch_name, status")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!batch) throw new Error("Selected batch not found.");
  if (batch.status !== "active") {
    throw new Error(
      `Batch "${batch.batch_name}" is ${batch.status === "completed" ? "closed" : batch.status}. Reopen it first or select an active batch.`,
    );
  }
  return batch;
}

function mapFinancialRow(r: any): FarmFinancial {
  const amount = Number(r.amount || 0);
  const rawPaid = r.amount_paid;
  const amountPaid = rawPaid !== null && rawPaid !== undefined ? Number(rawPaid) : amount;
  const balanceDue = Math.max(0, Math.round((amount - amountPaid) * 100) / 100);
  const paymentStatus: "paid" | "partial" | "unpaid" =
    balanceDue <= 0.005 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";

  return {
    id: r.id,
    batchId: r.batch_id ?? null,
    batchName: r.farm_batches?.batch_name ?? null,
    type: r.type,
    category: r.category,
    amount,
    amountPaid,
    balanceDue,
    paymentStatus,
    partyName: r.party_name ?? null,
    dueDate: r.due_date ?? null,
    description: r.description,
    paymentMethod: r.payment_method,
    transactionDate: r.transaction_date,
    referenceNo: r.reference_no ?? null,
    feedBags: r.feed_bags !== null && r.feed_bags !== undefined ? Number(r.feed_bags) : null,
    feedKgPerBag: r.feed_kg_per_bag !== null && r.feed_kg_per_bag !== undefined ? Number(r.feed_kg_per_bag) : null,
    feedBrand: r.feed_brand ?? null,
    recordedBy: r.recorded_by ?? null,
    approvalStatus: r.approval_status ?? "approved",
    rejectionReason: r.rejection_reason ?? null,
    createdAt: r.created_at,
  };
}

function mapActivityRow(r: any): FarmActivity {
  return {
    id: r.id,
    batchId: r.batch_id ?? null,
    batchName: r.farm_batches?.batch_name ?? null,
    activityDate: r.activity_date,
    activityType: r.activity_type,
    mortalityCount: Number(r.mortality_count || 0),
    causeOfMortality: r.cause_of_mortality ?? null,
    feedConsumedKg: Number(r.feed_consumed_kg || 0),
    eggsCollected: Number(r.eggs_collected || 0),
    medicationGiven: r.medication_given ?? null,
    notes: r.notes ?? null,
    recordedBy: r.recorded_by ?? null,
    approvalStatus: r.approval_status ?? "approved",
    rejectionReason: r.rejection_reason ?? null,
    createdAt: r.created_at,
    sickCount: Number(r.sick_count || 0),
    feedGiven: r.feed_given ?? null,
    feedBrand: r.feed_brand ?? null,
    feedBagNo: r.feed_bag_no !== null && r.feed_bag_no !== undefined ? Number(r.feed_bag_no) : null,
    feedBagStatus: r.feed_bag_status === "opened" || r.feed_bag_status === "finished" ? r.feed_bag_status : null,
    feedBagsUsed: r.feed_bags_used !== null && r.feed_bags_used !== undefined ? Number(r.feed_bags_used) : null,
    waterGiven: r.water_given ?? null,
    temperature: r.temperature ?? null,
  };
}

function computeAging(dueDate: string | null, fallbackDate: string): { daysOverdue: number; agingBucket: AgingBucket } {
  const refDate = dueDate || fallbackDate;
  if (!refDate) return { daysOverdue: 0, agingBucket: "current" };
  const today = new Date().toISOString().split("T")[0];
  const ms = new Date(`${today}T00:00:00Z`).getTime() - new Date(`${refDate.slice(0, 10)}T00:00:00Z`).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return { daysOverdue: 0, agingBucket: "current" };
  if (days <= 30) return { daysOverdue: days, agingBucket: "1_30" };
  if (days <= 60) return { daysOverdue: days, agingBucket: "31_60" };
  if (days <= 90) return { daysOverdue: days, agingBucket: "61_90" };
  return { daysOverdue: days, agingBucket: "90_plus" };
}

// ─── Farm Batches Server Functions ───────────────────────────────────────────

export const adminListBatches = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<FarmBatch[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("farm_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("farm_batches query warning:", error.message);
      return [];
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      batchName: r.batch_name,
      batchType: r.batch_type,
      initialHeadcount: Number(r.initial_headcount || 0),
      currentHeadcount: Number(r.current_headcount || 0),
      startDate: r.start_date,
      targetHarvestDate: r.target_harvest_date ?? null,
      status: r.status,
      closedAt: r.closed_at ?? null,
      closedBy: r.closed_by ?? null,
      notes: r.notes ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

export const adminCreateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createBatchSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("farm_batches")
      .insert({
        batch_name: data.batchName,
        batch_type: data.batchType,
        initial_headcount: data.initialHeadcount,
        current_headcount: data.initialHeadcount,
        start_date: data.startDate,
        target_harvest_date: data.targetHarvestDate || null,
        notes: data.notes || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Failed to register new farm batch in database.");
    return { id: row.id };
  });

export const adminUpdateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateBatchSchema.parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isClosed = data.status === "completed" || data.status === "archived";
    const { error } = await supabaseAdmin
      .from("farm_batches")
      .update({
        batch_name: data.batchName,
        batch_type: data.batchType,
        initial_headcount: data.initialHeadcount,
        current_headcount: data.currentHeadcount,
        status: data.status,
        closed_at: isClosed ? new Date().toISOString() : null,
        closed_by: isClosed ? credential.username : null,
        start_date: data.startDate,
        target_harvest_date: data.targetHarvestDate || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      if (/closed_at|closed_by/i.test(error.message)) {
        const { error: fallbackErr } = await supabaseAdmin
          .from("farm_batches")
          .update({
            batch_name: data.batchName,
            batch_type: data.batchType,
            initial_headcount: data.initialHeadcount,
            current_headcount: data.currentHeadcount,
            status: data.status,
            start_date: data.startDate,
            target_harvest_date: data.targetHarvestDate || null,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (fallbackErr) throw new Error(fallbackErr.message);
        return;
      }
      throw new Error(error.message);
    }
  });

export const adminCloseBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("farm_batches")
      .update({
        status: "completed",
        closed_at: now,
        closed_by: credential.username,
        updated_at: now,
      })
      .eq("id", data.id);

    if (error) {
      if (/closed_at|closed_by/i.test(error.message)) {
        const { error: fallbackErr } = await supabaseAdmin
          .from("farm_batches")
          .update({ status: "completed", updated_at: now })
          .eq("id", data.id);
        if (fallbackErr) throw new Error(fallbackErr.message);
        return { ok: true };
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminReopenBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("farm_batches")
      .update({
        status: "active",
        closed_at: null,
        closed_by: null,
        updated_at: now,
      })
      .eq("id", data.id);

    if (error) {
      if (/closed_at|closed_by/i.test(error.message)) {
        const { error: fallbackErr } = await supabaseAdmin
          .from("farm_batches")
          .update({ status: "active", updated_at: now })
          .eq("id", data.id);
        if (fallbackErr) throw new Error(fallbackErr.message);
        return { ok: true };
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("farm_batches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// ─── Financials Server Functions ─────────────────────────────────────────────

export const adminListFinancials = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.extend({ batchId: z.string().uuid().optional().nullable(), includePending: z.boolean().optional() }).parse(data))
  .handler(async ({ data }): Promise<FarmFinancial[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("farm_financials")
      .select("*, farm_batches(batch_name)")
      .order("transaction_date", { ascending: false });

    if (data.batchId) {
      query = query.eq("batch_id", data.batchId);
    }

    if (!data.includePending) {
      query = query.or("approval_status.eq.approved,approval_status.is.null");
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("farm_financials query warning:", error.message);
      return [];
    }

    return (rows || []).map(mapFinancialRow);
  });

export const adminCreateFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createFinancialSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";

    const paid =
      data.amountPaid !== null && data.amountPaid !== undefined ? Number(data.amountPaid) : Number(data.amount);
    if (paid > Number(data.amount)) {
      throw new Error("Amount paid cannot exceed total amount.");
    }
    const remaining = Number(data.amount) - paid;
    if (remaining > 0.005) {
      if (!data.partyName?.trim()) {
        throw new Error("Customer / supplier name is required when a balance remains unpaid.");
      }
      if (!data.dueDate?.trim()) {
        throw new Error("Due date is required when a balance remains unpaid.");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertBatchOpen(supabaseAdmin, data.batchId);

    const basePayload = {
      batch_id: data.batchId,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      payment_method: data.paymentMethod,
      transaction_date: data.transactionDate,
      reference_no: data.referenceNo || null,
      approval_status: approvalStatus,
      recorded_by: credential.username,
    };

    const extendedPayload = {
      ...basePayload,
      party_name: data.partyName?.trim() || null,
      due_date: data.dueDate?.trim() || null,
      amount_paid: paid,
      feed_bags: data.feedBags && data.feedBags > 0 ? data.feedBags : null,
      feed_kg_per_bag: data.feedBags && data.feedBags > 0 ? (data.feedKgPerBag || 25) : null,
      feed_brand: data.feedBrand?.trim() || null,
    };

    let rowId: string | null = null;
    const { data: row, error } = await (supabaseAdmin as any)
      .from("farm_financials")
      .insert(extendedPayload)
      .select("id")
      .single();

    if (error) {
      if (/amount_paid|party_name|due_date|feed_bags|feed_kg_per_bag|feed_brand/i.test(error.message)) {
        const { data: fallbackRow, error: fallbackErr } = await supabaseAdmin
          .from("farm_financials")
          .insert(basePayload)
          .select("id")
          .single();
        if (fallbackErr) throw new Error(fallbackErr.message);
        rowId = fallbackRow.id;
      } else {
        throw new Error(error.message);
      }
    } else {
      rowId = row.id;
      if (paid > 0 && remaining > 0.005) {
        try {
          await (supabaseAdmin as any).from("farm_financial_payments").insert({
            financial_id: rowId,
            payment_date: data.transactionDate,
            amount: paid,
            payment_method: data.paymentMethod,
            reference_no: data.referenceNo || null,
            notes: "Initial deposit at time of entry",
            approval_status: isOwner ? "approved" : "pending",
            recorded_by: credential.username,
          });
        } catch {
          // Table might not exist before migration; safe to ignore
        }
      }
    }

    return { id: rowId! };
  });

export const adminDeleteFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("farm_financials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const updateFinancialSchema = baseAuthSchema.extend({
  id: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  type: z.enum(["expense", "income"]),
  category: z.string().trim().min(1).max(100),
  amount: z.number().min(0),
  amountPaid: z.number().min(0).optional().nullable(),
  partyName: z.string().trim().max(150).optional().nullable(),
  dueDate: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().min(1).max(500),
  paymentMethod: z.string().trim().min(1).max(100).default("Bank Transfer"),
  transactionDate: z.string().trim().min(1),
  referenceNo: z.string().trim().max(100).optional().nullable(),
  feedBags: z.number().min(0).optional().nullable(),
  feedKgPerBag: z.number().min(1).max(500).optional().nullable(),
  feedBrand: z.string().trim().max(120).optional().nullable(),
});

export const adminUpdateFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateFinancialSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await checkOwner(data.passcode);
    const paid =
      data.amountPaid !== null && data.amountPaid !== undefined ? Number(data.amountPaid) : Number(data.amount);
    if (paid > Number(data.amount)) {
      throw new Error("Amount paid cannot exceed total amount.");
    }
    if (Number(data.amount) - paid > 0.005) {
      if (!data.partyName?.trim()) {
        throw new Error("Customer / supplier name is required when a balance remains unpaid.");
      }
      if (!data.dueDate?.trim()) {
        throw new Error("Due date is required when a balance remains unpaid.");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.batchId) {
      const { data: prev } = await supabaseAdmin
        .from("farm_financials")
        .select("batch_id")
        .eq("id", data.id)
        .maybeSingle();
      if (!prev || prev.batch_id !== data.batchId) {
        await assertBatchOpen(supabaseAdmin, data.batchId);
      }
    }

    const baseUpdate = {
      batch_id: data.batchId || null,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      payment_method: data.paymentMethod,
      transaction_date: data.transactionDate,
      reference_no: data.referenceNo || null,
    };

    const { error } = await (supabaseAdmin as any)
      .from("farm_financials")
      .update({
        ...baseUpdate,
        party_name: data.partyName?.trim() || null,
        due_date: data.dueDate?.trim() || null,
        amount_paid: paid,
        feed_bags: data.feedBags && data.feedBags > 0 ? data.feedBags : null,
        feed_kg_per_bag: data.feedBags && data.feedBags > 0 ? (data.feedKgPerBag || 25) : null,
        feed_brand: data.feedBrand?.trim() || null,
      })
      .eq("id", data.id);

    if (error) {
      if (/amount_paid|party_name|due_date|feed_bags|feed_kg_per_bag|feed_brand/i.test(error.message)) {
        const { error: fallbackErr } = await supabaseAdmin
          .from("farm_financials")
          .update(baseUpdate)
          .eq("id", data.id);
        if (fallbackErr) throw new Error(fallbackErr.message);
      } else {
        throw new Error(error.message);
      }
    }
    return { id: data.id };
  });

export const adminRecordFinancialPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema
      .extend({
        financialId: z.string().uuid(),
        amount: z.number().positive("Payment amount must be greater than zero."),
        paymentDate: z.string().trim().min(1),
        paymentMethod: z.string().trim().min(1).max(100).default("Bank Transfer"),
        referenceNo: z.string().trim().max(100).optional().nullable(),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ id: string; approvalStatus: "approved" | "pending"; newAmountPaid: number }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: fin, error: finErr } = await (supabaseAdmin as any)
      .from("farm_financials")
      .select("id, amount, amount_paid, approval_status")
      .eq("id", data.financialId)
      .single();

    if (finErr || !fin) throw new Error("Financial transaction not found.");
    if (fin.approval_status && fin.approval_status !== "approved") {
      throw new Error("Approve the original transaction before recording follow-up payments.");
    }

    const total = Number(fin.amount || 0);
    const currentPaid = fin.amount_paid !== null && fin.amount_paid !== undefined ? Number(fin.amount_paid) : total;
    const balance = Math.max(0, Math.round((total - currentPaid) * 100) / 100);
    if (balance <= 0.005) throw new Error("This transaction is already fully paid.");
    if (data.amount > balance + 0.01) {
      throw new Error(`Payment amount (₦${data.amount.toLocaleString()}) exceeds remaining balance (₦${balance.toLocaleString()}).`);
    }

    const nextPaid = Math.min(total, Math.round((currentPaid + data.amount) * 100) / 100);
    const approvalStatus = isOwner ? "approved" : "pending";

    const { data: pmt, error: pmtErr } = await (supabaseAdmin as any)
      .from("farm_financial_payments")
      .insert({
        financial_id: data.financialId,
        payment_date: data.paymentDate,
        amount: data.amount,
        payment_method: data.paymentMethod,
        reference_no: data.referenceNo || null,
        notes: data.notes || null,
        approval_status: approvalStatus,
        recorded_by: credential.username,
      })
      .select("id")
      .single();

    if (pmtErr) throw new Error(pmtErr.message);

    if (isOwner) {
      const { error: updErr } = await (supabaseAdmin as any)
        .from("farm_financials")
        .update({ amount_paid: nextPaid })
        .eq("id", data.financialId);
      if (updErr) throw new Error(updErr.message);
    }

    return {
      id: pmt.id,
      approvalStatus,
      newAmountPaid: isOwner ? nextPaid : currentPaid,
    };
  });

export const adminListFinancialPayments = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.extend({ financialId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<FarmFinancialPayment[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await (supabaseAdmin as any)
      .from("farm_financial_payments")
      .select("*")
      .eq("financial_id", data.financialId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("farm_financial_payments query warning:", error.message);
      return [];
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      financialId: r.financial_id,
      paymentDate: r.payment_date,
      amount: Number(r.amount || 0),
      paymentMethod: r.payment_method || "Bank Transfer",
      referenceNo: r.reference_no ?? null,
      notes: r.notes ?? null,
      approvalStatus: r.approval_status || "approved",
      rejectionReason: r.rejection_reason ?? null,
      recordedBy: r.recorded_by ?? null,
      createdAt: r.created_at,
    }));
  });

export const adminListDebtorsCreditorsReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema.extend({ batchId: z.string().uuid().optional().nullable() }).parse(data),
  )
  .handler(async ({ data }): Promise<DebtorsCreditorsReport> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let finQuery = (supabaseAdmin as any)
      .from("farm_financials")
      .select("*, farm_batches(batch_name)")
      .or("approval_status.eq.approved,approval_status.is.null")
      .not("amount_paid", "is", null)
      .order("transaction_date", { ascending: false });

    let contactQuery = (supabaseAdmin as any)
      .from("contact_transactions")
      .select("*, special_contacts(contact_name, phone, category), farm_batches(batch_name)")
      .order("transaction_date", { ascending: false });

    if (data.batchId) {
      finQuery = finQuery.eq("batch_id", data.batchId);
      contactQuery = contactQuery.eq("batch_id", data.batchId);
    }

    const [finRes, contactRes] = await Promise.all([finQuery, contactQuery]);

    const items: DebtorCreditorItem[] = [];

    if (!finRes.error) {
      for (const r of finRes.data || []) {
        const mapped = mapFinancialRow(r);
        if (!mapped.balanceDue || mapped.balanceDue <= 0.005) continue;
        const kind: "debtor" | "creditor" = mapped.type === "income" ? "debtor" : "creditor";
        const aging = computeAging(mapped.dueDate ?? null, mapped.transactionDate);
        items.push({
          id: mapped.id,
          source: "farm_financial",
          kind,
          partyName: mapped.partyName?.trim() || "Unnamed Party",
          partyPhone: null,
          contactId: null,
          batchId: mapped.batchId,
          batchName: mapped.batchName ?? null,
          category: mapped.category,
          description: mapped.description,
          transactionDate: mapped.transactionDate,
          dueDate: mapped.dueDate ?? null,
          totalAmount: mapped.amount,
          amountPaid: Number(mapped.amountPaid || 0),
          balanceDue: mapped.balanceDue,
          paymentStatus: mapped.paymentStatus === "partial" ? "partial" : "unpaid",
          daysOverdue: aging.daysOverdue,
          agingBucket: aging.agingBucket,
        });
      }
    }

    if (!contactRes.error) {
      for (const r of contactRes.data || []) {
        if (r.approval_status && r.approval_status !== "approved") continue;
        const total = Number(r.total_amount || 0);
        const paid = Number(r.amount_paid || 0);
        const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
        if (balance <= 0.005) continue;
        if (r.transaction_type !== "offload" && r.transaction_type !== "supply") continue;

        const kind: "debtor" | "creditor" = r.transaction_type === "offload" ? "debtor" : "creditor";
        const aging = computeAging(null, r.transaction_date);
        items.push({
          id: r.id,
          source: "contact_tx",
          kind,
          partyName: r.special_contacts?.contact_name || "Special Contact",
          partyPhone: r.special_contacts?.phone ?? null,
          contactId: r.contact_id,
          batchId: r.batch_id ?? null,
          batchName: r.farm_batches?.batch_name ?? null,
          category: r.transaction_type === "offload" ? "Offload Credit Sale" : "Supplier Credit",
          description: r.item_description,
          transactionDate: r.transaction_date,
          dueDate: null,
          totalAmount: total,
          amountPaid: paid,
          balanceDue: balance,
          paymentStatus: paid > 0 ? "partial" : "unpaid",
          daysOverdue: aging.daysOverdue,
          agingBucket: aging.agingBucket,
        });
      }
    }

    items.sort((a, b) => b.daysOverdue - a.daysOverdue || b.balanceDue - a.balanceDue);

    let totalReceivable = 0;
    let totalPayable = 0;
    let overdueReceivable = 0;
    let overduePayable = 0;
    let debtorCount = 0;
    let creditorCount = 0;

    const partyMap = new Map<
      string,
      {
        kind: "debtor" | "creditor";
        partyName: string;
        partyPhone: string | null;
        totalAmount: number;
        totalPaid: number;
        balanceDue: number;
        count: number;
        maxDaysOverdue: number;
      }
    >();

    for (const item of items) {
      if (item.kind === "debtor") {
        totalReceivable += item.balanceDue;
        debtorCount++;
        if (item.daysOverdue > 0) overdueReceivable += item.balanceDue;
      } else {
        totalPayable += item.balanceDue;
        creditorCount++;
        if (item.daysOverdue > 0) overduePayable += item.balanceDue;
      }

      const key = `${item.kind}::${item.partyName.toLowerCase().trim()}`;
      const existing = partyMap.get(key) || {
        kind: item.kind,
        partyName: item.partyName,
        partyPhone: item.partyPhone,
        totalAmount: 0,
        totalPaid: 0,
        balanceDue: 0,
        count: 0,
        maxDaysOverdue: 0,
      };
      existing.totalAmount += item.totalAmount;
      existing.totalPaid += item.amountPaid;
      existing.balanceDue += item.balanceDue;
      existing.count += 1;
      existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, item.daysOverdue);
      if (!existing.partyPhone && item.partyPhone) existing.partyPhone = item.partyPhone;
      partyMap.set(key, existing);
    }

    return {
      items,
      summary: {
        totalReceivable,
        totalPayable,
        overdueReceivable,
        overduePayable,
        debtorCount,
        creditorCount,
      },
      partyTotals: Array.from(partyMap.values()).sort((a, b) => b.balanceDue - a.balanceDue),
    };
  });

export const adminGetBatchReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<BatchReport | null> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch batch
    const { data: batchRow, error: bErr } = await supabaseAdmin
      .from("farm_batches")
      .select("*")
      .eq("id", data.batchId)
      .single();

    if (bErr || !batchRow) return null;

    const batch: FarmBatch = {
      id: batchRow.id,
      batchName: batchRow.batch_name,
      batchType: batchRow.batch_type,
      initialHeadcount: Number(batchRow.initial_headcount || 0),
      currentHeadcount: Number(batchRow.current_headcount || 0),
      startDate: batchRow.start_date,
      targetHarvestDate: batchRow.target_harvest_date ?? null,
      status: batchRow.status,
      closedAt: batchRow.closed_at ?? null,
      closedBy: batchRow.closed_by ?? null,
      notes: batchRow.notes ?? null,
      createdAt: batchRow.created_at,
      updatedAt: batchRow.updated_at,
    };

    // Fetch financials for batch (approved only)
    const { data: finRows } = await supabaseAdmin
      .from("farm_financials")
      .select("*")
      .eq("batch_id", data.batchId)
      .or("approval_status.eq.approved,approval_status.is.null")
      .order("transaction_date", { ascending: true });

    const financials: FarmFinancial[] = (finRows || []).map(mapFinancialRow);

    // Fetch activities for batch (approved only)
    const { data: actRows } = await supabaseAdmin
      .from("farm_activities")
      .select("*")
      .eq("batch_id", data.batchId)
      .or("approval_status.eq.approved,approval_status.is.null")
      .order("activity_date", { ascending: true });

    const activities: FarmActivity[] = (actRows || []).map((r: any) => ({
      id: r.id,
      batchId: r.batch_id,
      activityDate: r.activity_date,
      activityType: r.activity_type,
      mortalityCount: Number(r.mortality_count || 0),
      causeOfMortality: r.cause_of_mortality ?? null,
      feedConsumedKg: Number(r.feed_consumed_kg || 0),
      eggsCollected: Number(r.eggs_collected || 0),
      medicationGiven: r.medication_given ?? null,
      notes: r.notes ?? null,
      recordedBy: r.recorded_by ?? null,
      createdAt: r.created_at,
    }));

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    for (const f of financials) {
      if (f.type === "income") {
        totalIncome += f.amount;
        incomeByCategory[f.category] = (incomeByCategory[f.category] || 0) + f.amount;
      } else {
        totalExpense += f.amount;
        expenseByCategory[f.category] = (expenseByCategory[f.category] || 0) + f.amount;
      }
    }

    const netProfit = totalIncome - totalExpense;
    const roiPercentage = totalExpense > 0 ? (netProfit / totalExpense) * 100 : 0;
    const costPerBird = batch.initialHeadcount > 0 ? totalExpense / batch.initialHeadcount : 0;
    const revenuePerBird = batch.initialHeadcount > 0 ? totalIncome / batch.initialHeadcount : 0;

    let totalMortality = 0;
    let totalFeedConsumedKg = 0;
    let totalEggsCollected = 0;

    for (const a of activities) {
      totalMortality += a.mortalityCount;
      totalFeedConsumedKg += a.feedConsumedKg;
      totalEggsCollected += a.eggsCollected;
    }

    const mortalityRatePercentage =
      batch.initialHeadcount > 0 ? (totalMortality / batch.initialHeadcount) * 100 : 0;
    batch.currentHeadcount = Math.max(0, batch.initialHeadcount - totalMortality);

    return {
      batch,
      totalIncome,
      totalExpense,
      netProfit,
      roiPercentage,
      costPerBird,
      revenuePerBird,
      totalMortality,
      mortalityRatePercentage,
      totalFeedConsumedKg,
      totalEggsCollected,
      expenseByCategory,
      incomeByCategory,
      financials,
      activities,
    };
  });

// ─── CRM Leads Server Functions ──────────────────────────────────────────────

export const adminListLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<CrmLead[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let { data: rows, error } = await supabaseAdmin
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    // Auto-sync Pre-Orders into crm_leads if missing
    try {
      const { data: preorders } = await supabaseAdmin
        .from("preorders")
        .select("customer_name, phone, address, product, total_amount, payment_status, notes")
        .limit(2000);

      if (preorders && preorders.length > 0) {
        const existingPhones = new Set((rows || []).map((r: any) => r.phone?.replace(/\D/g, "")).filter(Boolean));
        const newLeads: any[] = [];
        for (const po of preorders) {
          const cleanP = po.phone ? po.phone.replace(/\D/g, "") : "";
          if (!cleanP || existingPhones.has(cleanP)) continue;
          existingPhones.add(cleanP);
          newLeads.push({
            full_name: po.customer_name,
            phone: po.phone,
            location: po.address || "Owerri, Imo State",
            lead_source: "December Pre-Order",
            interested_in: po.product || "Live Broiler Chicken",
            status: po.payment_status === "fully_paid" ? "Customer (Converted)" : "December Pre-Order",
            estimated_value: po.total_amount || 0,
            notes: po.notes || "Pre-order reservation customer",
          });
        }
        if (newLeads.length > 0) {
          await supabaseAdmin.from("crm_leads").insert(newLeads);
          const { data: updatedRows } = await supabaseAdmin
            .from("crm_leads")
            .select("*")
            .order("created_at", { ascending: false });
          if (updatedRows) rows = updatedRows;
        }
      }
    } catch (e) {
      console.warn("Preorder to CRM sync warning:", e);
    }

    if (error) {
      console.warn("crm_leads query warning:", error.message);
      return [];
    }

    // Fetch activities/communication logs
    let activitiesByLead: Record<string, LeadCommunication[]> = {};
    try {
      const { data: actRows } = await supabaseAdmin
        .from("crm_lead_activities")
        .select("*")
        .order("created_at", { ascending: false });

      if (actRows) {
        for (const act of actRows) {
          const leadId = act.lead_id;
          if (!activitiesByLead[leadId]) activitiesByLead[leadId] = [];
          activitiesByLead[leadId].push({
            id: act.id,
            leadId: act.lead_id,
            activityType: act.activity_type,
            messageSummary: act.message_summary,
            content: act.content ?? null,
            sentBy: act.sent_by ?? "Admin",
            createdAt: act.created_at,
          });
        }
      }
    } catch (e) {
      // Ignore if table not yet created
    }

    return (rows || []).map((r: any) => {
      const comms = activitiesByLead[r.id] || [];
      const lastContactedAt = comms.length > 0 ? comms[0].createdAt : null;

      return {
        id: r.id,
        fullName: r.full_name,
        phone: r.phone,
        email: r.email ?? null,
        location: r.location ?? null,
        leadSource: r.lead_source,
        interestedIn: r.interested_in ?? null,
        status: r.status,
        estimatedValue: Number(r.estimated_value || 0),
        notes: r.notes ?? null,
        followUpDate: r.follow_up_date ?? null,
        communications: comms,
        lastContactedAt,
        totalMessagesCount: comms.length,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  });

export const adminLogLeadCommunication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        leadId: z.string().uuid(),
        activityType: z.string().default("WhatsApp Message"),
        messageSummary: z.string().min(1),
        content: z.string().optional().nullable(),
        sentBy: z.string().optional().nullable(),
        updateStatusToContacted: z.boolean().default(true),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      await supabaseAdmin.from("crm_lead_activities").insert({
        lead_id: data.leadId,
        activity_type: data.activityType,
        message_summary: data.messageSummary,
        content: data.content || null,
        sent_by: data.sentBy || "Admin",
      });

      if (data.updateStatusToContacted) {
        await supabaseAdmin
          .from("crm_leads")
          .update({
            status: "Contacted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.leadId)
          .eq("status", "New Lead");
      }
    } catch (err) {
      console.error("Failed to log lead communication:", err);
    }

    return { success: true };
  });

export const adminEnsureLeadAndLogComm = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        fullName: z.string(),
        phone: z.string(),
        location: z.string().optional().nullable(),
        activityType: z.string().default("WhatsApp Message"),
        messageSummary: z.string().min(1),
        content: z.string().optional().nullable(),
        sentBy: z.string().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<{ success: boolean; leadId: string }> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanP = data.phone.replace(/\D/g, "");
    let leadId = "";

    try {
      const { data: existingLeads } = await supabaseAdmin
        .from("crm_leads")
        .select("id, phone")
        .limit(1000);

      const match = (existingLeads || []).find((l: any) => l.phone?.replace(/\D/g, "") === cleanP);
      if (match) {
        leadId = match.id;
      } else {
        const { data: newLead, error } = await supabaseAdmin
          .from("crm_leads")
          .insert({
            full_name: data.fullName,
            phone: data.phone,
            location: data.location || "Owerri, Imo State",
            lead_source: "Client Follow-up",
            status: "Contacted",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        leadId = newLead.id;
      }

      await supabaseAdmin.from("crm_lead_activities").insert({
        lead_id: leadId,
        activity_type: data.activityType,
        message_summary: data.messageSummary,
        content: data.content || null,
        sent_by: data.sentBy || "Admin",
      });
    } catch (e) {
      console.warn("Client follow-up log warning:", e);
    }

    return { success: true, leadId };
  });

export const adminCreateLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createLeadSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("crm_leads")
      .insert({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        location: data.location || null,
        lead_source: data.leadSource,
        interested_in: data.interestedIn || null,
        status: data.status,
        estimated_value: data.estimatedValue,
        notes: data.notes || null,
        follow_up_date: data.followUpDate || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminUpdateLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateLeadSchema.parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("crm_leads")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        location: data.location || null,
        lead_source: data.leadSource,
        interested_in: data.interestedIn || null,
        status: data.status,
        estimated_value: data.estimatedValue,
        notes: data.notes || null,
        follow_up_date: data.followUpDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
  });

export const adminDeleteLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("crm_leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const batchImportLeadItemSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(3),
  email: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  leadSource: z.string().default("CSV/Excel Import"),
  interestedIn: z.string().optional().nullable(),
  status: z.enum(["New Lead", "Contacted", "Interested / Negotiating", "Converted to Customer", "Lost / Inactive"]).default("New Lead"),
  estimatedValue: z.number().default(0),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

export const adminBatchImportLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      leads: z.array(batchImportLeadItemSchema),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<{ importedCount: number }> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.leads || data.leads.length === 0) {
      return { importedCount: 0 };
    }

    const rows = data.leads.map((item) => ({
      full_name: item.fullName,
      phone: item.phone,
      email: item.email || null,
      location: item.location || null,
      lead_source: item.leadSource || "Batch Import",
      interested_in: item.interestedIn || null,
      status: item.status || "New Lead",
      estimated_value: item.estimatedValue || 0,
      notes: item.notes || null,
      follow_up_date: item.followUpDate || null,
    }));

    const { error } = await supabaseAdmin.from("crm_leads").insert(rows);

    if (error) throw new Error(error.message);
    return { importedCount: rows.length };
  });

// ─── Farm Activities Server Functions ────────────────────────────────────────

export const adminListActivities = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.extend({ batchId: z.string().uuid().optional().nullable(), includePending: z.boolean().optional() }).parse(data))
  .handler(async ({ data }): Promise<FarmActivity[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("farm_activities")
      .select("*, farm_batches(batch_name)")
      .order("activity_date", { ascending: false });

    if (data.batchId) {
      query = query.eq("batch_id", data.batchId);
    }

    if (!data.includePending) {
      query = query.or("approval_status.eq.approved,approval_status.is.null");
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("farm_activities query warning:", error.message);
      return [];
    }

    return (rows || []).map(mapActivityRow);
  });

export const adminCreateActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createActivitySchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertBatchOpen(supabaseAdmin, data.batchId);

    const { data: row, error } = await supabaseAdmin
      .from("farm_activities")
      .insert({
        batch_id: data.batchId,
        activity_date: data.activityDate,
        activity_type: data.activityType,
        mortality_count: data.mortalityCount,
        cause_of_mortality: data.causeOfMortality || null,
        feed_consumed_kg: data.feedConsumedKg,
        eggs_collected: data.eggsCollected,
        medication_given: data.medicationGiven || null,
        notes: data.notes || null,
        approval_status: approvalStatus,
        recorded_by: credential.username,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // If approved owner entry with mortality, adjust batch current_headcount immediately
    if (isOwner && data.batchId && data.mortalityCount > 0) {
      const { data: b } = await supabaseAdmin
        .from("farm_batches")
        .select("current_headcount")
        .eq("id", data.batchId)
        .single();

      if (b) {
        const nextCount = Math.max(0, Number(b.current_headcount || 0) - data.mortalityCount);
        await supabaseAdmin
          .from("farm_batches")
          .update({ current_headcount: nextCount, updated_at: new Date().toISOString() })
          .eq("id", data.batchId);
      }
    }

    return { id: row.id };
  });

// ─── Unified Daily Log (one record per batch per day) ────────────────────────

const dailyLogSchema = baseAuthSchema.extend({
  batchId: z.string().uuid(),
  activityDate: z.string().trim().min(1),
  sickCount: z.number().int().min(0).default(0),
  mortalityCount: z.number().int().min(0).default(0),
  causeOfMortality: z.string().trim().max(200).optional().nullable(),
  feedGiven: z.boolean().default(false),
  feedConsumedKg: z.number().min(0).default(0),
  feedBrand: z.string().trim().max(120).optional().nullable(),
  feedBagNo: z.number().int().min(1).optional().nullable(),
  feedBagStatus: z.enum(["opened", "finished"]).optional().nullable(),
  feedBagsUsed: z.number().min(0).optional().nullable(),
  waterGiven: z.boolean().default(false),
  temperature: z.string().trim().max(60).optional().nullable(),
  medicationGiven: z.string().trim().max(300).optional().nullable(),
  eggsCollected: z.number().int().min(0).default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

async function adjustBatchHeadcount(supabaseAdmin: any, batchId: string, delta: number) {
  if (!delta) return;
  const { data: b } = await supabaseAdmin
    .from("farm_batches")
    .select("current_headcount")
    .eq("id", batchId)
    .single();
  if (!b) return;
  const nextCount = Math.max(0, Number(b.current_headcount || 0) - delta);
  await supabaseAdmin
    .from("farm_batches")
    .update({ current_headcount: nextCount, updated_at: new Date().toISOString() })
    .eq("id", batchId);
}

function dailyLogRow(data: z.infer<typeof dailyLogSchema>, includeBagCols = true) {
  const bagNo = data.feedGiven && data.feedBagNo ? data.feedBagNo : null;
  const bagStatus = bagNo && data.feedBagStatus ? data.feedBagStatus : null;
  const bagsUsed =
    bagNo && bagStatus
      ? data.feedBagsUsed !== null && data.feedBagsUsed !== undefined
        ? data.feedBagsUsed
        : bagStatus === "finished"
          ? bagNo
          : Math.max(0, bagNo - 1)
      : null;

  const base = {
    batch_id: data.batchId,
    activity_date: data.activityDate,
    activity_type: "Daily Log",
    sick_count: data.sickCount,
    mortality_count: data.mortalityCount,
    cause_of_mortality: data.mortalityCount > 0 ? data.causeOfMortality || null : null,
    feed_given: data.feedGiven,
    feed_consumed_kg: data.feedGiven ? data.feedConsumedKg : 0,
    feed_brand: data.feedBrand || null,
    water_given: data.waterGiven,
    temperature: data.temperature || null,
    medication_given: data.medicationGiven || null,
    eggs_collected: data.eggsCollected,
    notes: data.notes || null,
  };

  if (!includeBagCols) return base;
  return {
    ...base,
    feed_bag_no: bagNo,
    feed_bag_status: bagStatus,
    feed_bags_used: bagsUsed,
  };
}

export const adminGetDailyLogDates = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema.extend({ batchId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<FarmActivity[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("farm_activities")
      .select("*")
      .eq("batch_id", data.batchId)
      .eq("activity_type", "Daily Log")
      .order("activity_date", { ascending: false })
      .limit(60);
    if (error) {
      console.warn("daily log query warning:", error.message);
      return [];
    }
    return (rows || []).map(mapActivityRow);
  });

export const adminCreateDailyLog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dailyLogSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string; approvalStatus: string }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertBatchOpen(supabaseAdmin, data.batchId);

    const { data: existing } = await supabaseAdmin
      .from("farm_activities")
      .select("id")
      .eq("batch_id", data.batchId)
      .eq("activity_date", data.activityDate)
      .eq("activity_type", "Daily Log")
      .maybeSingle();
    if (existing) {
      throw new Error(
        "A Daily Log already exists for this batch and date. Ask the Farm Owner to edit it.",
      );
    }

    let { data: row, error } = await (supabaseAdmin as any)
      .from("farm_activities")
      .insert({
        ...dailyLogRow(data, true),
        approval_status: approvalStatus,
        recorded_by: credential.username,
      })
      .select("id")
      .single();

    if (error && /feed_bag_no|feed_bag_status|feed_bags_used/i.test(error.message)) {
      const retry = await supabaseAdmin
        .from("farm_activities")
        .insert({
          ...dailyLogRow(data, false),
          approval_status: approvalStatus,
          recorded_by: credential.username,
        })
        .select("id")
        .single();
      row = retry.data;
      error = retry.error;
    }

    if (error) {
      if (/sick_count|feed_given|feed_brand|water_given|temperature/i.test(error.message)) {
        throw new Error(
          "Database update required: please run the latest Supabase migration (daily_log_fields).",
        );
      }
      throw new Error(error.message);
    }

    if (isOwner && data.mortalityCount > 0) {
      await adjustBatchHeadcount(supabaseAdmin, data.batchId, data.mortalityCount);
    }
    return { id: row.id, approvalStatus };
  });

export const adminUpdateDailyLog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dailyLogSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertBatchOpen(supabaseAdmin, data.batchId);

    const { data: prev, error: prevErr } = await supabaseAdmin
      .from("farm_activities")
      .select("mortality_count, approval_status")
      .eq("id", data.id)
      .single();
    if (prevErr || !prev) throw new Error("Daily Log not found.");

    let { error } = await (supabaseAdmin as any)
      .from("farm_activities")
      .update(dailyLogRow(data, true))
      .eq("id", data.id);

    if (error && /feed_bag_no|feed_bag_status|feed_bags_used/i.test(error.message)) {
      const retry = await supabaseAdmin
        .from("farm_activities")
        .update(dailyLogRow(data, false))
        .eq("id", data.id);
      error = retry.error;
    }
    if (error) throw new Error(error.message);

    // Headcount was only deducted once the log was approved; adjust by the difference.
    if ((prev.approval_status ?? "approved") === "approved") {
      await adjustBatchHeadcount(
        supabaseAdmin,
        data.batchId,
        data.mortalityCount - Number(prev.mortality_count || 0),
      );
    }
    return { ok: true };
  });

export const adminGetBatchFeedLedger = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.extend({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<BatchFeedLedger> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: finRows }, { data: actRows }] = await Promise.all([
      (supabaseAdmin as any)
        .from("farm_financials")
        .select("*")
        .eq("batch_id", data.batchId)
        .eq("type", "expense")
        .ilike("category", "%feed%")
        .or("approval_status.eq.approved,approval_status.is.null"),
      (supabaseAdmin as any)
        .from("farm_activities")
        .select("*")
        .eq("batch_id", data.batchId)
        .or("approval_status.eq.approved,approval_status.is.null")
        .order("activity_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    let bagsBought = 0;
    let totalKgBought = 0;
    let totalFeedSpend = 0;
    const brandMap = new Map<string, { brand: string; bagsBought: number; spend: number }>();

    for (const r of finRows || []) {
      const amt = Number(r.amount || 0);
      totalFeedSpend += amt;
      const bags = Number(r.feed_bags || 0);
      const kgPerBag = Number(r.feed_kg_per_bag || 25);
      if (bags > 0) {
        bagsBought += bags;
        totalKgBought += bags * kgPerBag;
      }
      const brandLabel = (r.feed_brand || "Unspecified Feed").trim() || "Unspecified Feed";
      const prev = brandMap.get(brandLabel) || { brand: brandLabel, bagsBought: 0, spend: 0 };
      prev.bagsBought += bags;
      prev.spend += amt;
      brandMap.set(brandLabel, prev);
    }

    const defaultKgPerBag = bagsBought > 0 ? Math.round((totalKgBought / bagsBought) * 10) / 10 : 25;
    const avgCostPerBag = bagsBought > 0 ? Math.round((totalFeedSpend / bagsBought) * 100) / 100 : 0;

    let totalKgUsed = 0;
    let bagsFinished = 0;
    let currentOpenBagNo: number | null = null;
    let lastEntry: BatchFeedLedger["lastEntry"] = null;

    for (const a of actRows || []) {
      totalKgUsed += Number(a.feed_consumed_kg || 0);
      const bagNo = a.feed_bag_no !== null && a.feed_bag_no !== undefined ? Number(a.feed_bag_no) : null;
      const bagStatus =
        a.feed_bag_status === "opened" || a.feed_bag_status === "finished" ? a.feed_bag_status : null;
      if (bagNo && bagStatus) {
        const cumUsed =
          a.feed_bags_used !== null && a.feed_bags_used !== undefined
            ? Number(a.feed_bags_used)
            : bagStatus === "finished"
              ? bagNo
              : Math.max(0, bagNo - 1);
        if (cumUsed > bagsFinished) bagsFinished = cumUsed;
        if (!lastEntry) {
          lastEntry = {
            activityDate: a.activity_date,
            feedBagNo: bagNo,
            feedBagStatus: bagStatus,
            feedBagsUsed: cumUsed,
            feedBrand: a.feed_brand ?? null,
          };
          if (bagStatus === "opened") {
            currentOpenBagNo = bagNo;
          }
        }
      }
    }

    const bagsInStock = Math.max(0, Math.round((bagsBought - bagsFinished) * 100) / 100);
    const usedFeedValue =
      avgCostPerBag > 0
        ? Math.round(Math.min(bagsBought, bagsFinished) * avgCostPerBag * 100) / 100
        : 0;
    const remainingStockValue = Math.round(bagsInStock * avgCostPerBag * 100) / 100;

    return {
      batchId: data.batchId,
      bagsBought,
      bagsFinished,
      currentOpenBagNo,
      bagsInStock,
      defaultKgPerBag,
      totalKgBought,
      totalKgUsed: Math.round(totalKgUsed * 10) / 10,
      totalFeedSpend,
      avgCostPerBag,
      usedFeedValue,
      remainingStockValue,
      lastEntry,
      brandBreakdown: Array.from(brandMap.values()).sort((a, b) => b.spend - a.spend),
    };
  });

export const adminDeleteActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("farm_activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const adminImportFinancialsWithAutoMatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        batchId: z.string().uuid("Please select an active batch for imported records."),
        records: z.array(
          z.object({
            type: z.enum(["income", "expense"]),
            category: z.string().trim().min(1),
            amount: z.number().min(0),
            description: z.string().trim().min(1),
            paymentMethod: z.string().trim().default("Bank Transfer"),
            transactionDate: z.string().trim().min(1),
            referenceNo: z.string().trim().optional().nullable(),
            customerName: z.string().trim().optional().nullable(),
            customerPhone: z.string().trim().optional().nullable(),
          })
        ),
      })
      .parse(data)
  )
  .handler(
    async ({
      data,
    }): Promise<{
      totalImported: number;
      matchedOrdersCount: number;
      unmatchedOfflineCount: number;
      matchedDetails: string[];
    }> => {
      const role = await checkPasscode(data.passcode);
      const credential = parseAdminCredential(data.passcode);
      const isOwner = role === "owner";
      const approvalStatus = isOwner ? "approved" : "pending_approval";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      await assertBatchOpen(supabaseAdmin, data.batchId);

      // Fetch active website orders and preorders for customer auto-matching
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id, order_code, customer_name, phone, total, batch_id");

      const { data: preorders } = await (supabaseAdmin as any)
        .from("preorders")
        .select("id, preorder_code, customer_name, customer_phone, phone, total_amount, batch_id");

      let matchedOrdersCount = 0;
      let unmatchedOfflineCount = 0;
      const matchedDetails: string[] = [];
      const insertRows: any[] = [];

      for (const item of data.records) {
        let matchedOrderCode: string | null = null;
        let matchedOrderId: string | null = null;
        let isPreorder = false;

        if (item.type === "income" && (item.customerPhone || item.customerName)) {
          const normPhone = (item.customerPhone || "").replace(/\D/g, "");
          const normName = (item.customerName || "").trim().toLowerCase();

          // 1. Check orders by phone
          let matchedOrder = (orders as any[])?.find((o: any) => {
            const ph = o.phone || o.customer_phone;
            if (!ph) return false;
            const p = String(ph).replace(/\D/g, "");
            return p.length >= 7 && normPhone.length >= 7 && (p.endsWith(normPhone) || normPhone.endsWith(p));
          });

          // 2. Check orders by name tokens if phone not matched
          if (!matchedOrder && normName.length >= 3) {
            const nameTokens = normName.split(/\s+/).filter((t) => t.length > 2);
            matchedOrder = (orders as any[])?.find((o: any) => {
              if (!o.customer_name) return false;
              const cName = o.customer_name.toLowerCase();
              return nameTokens.every((tok) => cName.includes(tok));
            });
          }

          // 3. Check preorders if still not matched
          if (!matchedOrder && normPhone.length >= 7) {
            const matchedPre = (preorders as any[])?.find((po: any) => {
              const ph = po.customer_phone || po.phone;
              if (!ph) return false;
              const p = String(ph).replace(/\D/g, "");
              return p.length >= 7 && (p.endsWith(normPhone) || normPhone.endsWith(p));
            });
            if (matchedPre) {
              matchedOrderCode = matchedPre.preorder_code;
              matchedOrderId = matchedPre.id;
              isPreorder = true;
            }
          }

          if (matchedOrder) {
            matchedOrderCode = matchedOrder.order_code;
            matchedOrderId = matchedOrder.id;
          }

          if (matchedOrderCode && matchedOrderId) {
            matchedOrdersCount++;
            matchedDetails.push(`Matched '${item.customerName || item.customerPhone}' -> Order #${matchedOrderCode}`);

            // Automatically link website order to the specified farm batch if selected and approved by owner
            if (data.batchId && isOwner) {
              const table = isPreorder ? "preorders" : "orders";
              await supabaseAdmin.from(table).update({ batch_id: data.batchId }).eq("id", matchedOrderId);
            }
          } else {
            unmatchedOfflineCount++;
          }
        } else {
          unmatchedOfflineCount++;
        }

        const desc = matchedOrderCode
          ? `${item.description} (Auto-matched Order #${matchedOrderCode})`
          : item.customerName
          ? `${item.description} (Customer: ${item.customerName})`
          : item.description;

        insertRows.push({
          batch_id: data.batchId || null,
          type: item.type,
          category: item.category,
          amount: item.amount,
          description: desc,
          payment_method: item.paymentMethod || "Bank Transfer",
          transaction_date: item.transactionDate || new Date().toISOString().split("T")[0],
          reference_no: item.referenceNo || (matchedOrderCode ? `ORDER-${matchedOrderCode}` : null),
          approval_status: approvalStatus,
          recorded_by: credential.username,
        });
      }

      if (insertRows.length > 0) {
        const { error: insErr } = await supabaseAdmin.from("farm_financials").insert(insertRows);
        if (insErr) throw new Error(insErr.message);
      }

      return {
        totalImported: insertRows.length,
        matchedOrdersCount,
        unmatchedOfflineCount,
        matchedDetails,
      };
    }
  );

// ─── Staff Approvals Management Server Functions ─────────────────────────────

export const adminGetPendingApprovalsCount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<{ count: number }> => {
    const role = await checkPasscode(data.passcode);
    if (role !== "owner") return { count: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: finCount }, { count: actCount }, contactRes, pmtRes] = await Promise.all([
      supabaseAdmin
        .from("farm_financials")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending_approval"),
      supabaseAdmin
        .from("farm_activities")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending_approval"),
      supabaseAdmin
        .from("contact_transactions")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending_approval"),
      (supabaseAdmin as any)
        .from("farm_financial_payments")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending"),
    ]);

    const contactCount = contactRes.error ? 0 : (contactRes.count || 0);
    const pmtCount = pmtRes.error ? 0 : (pmtRes.count || 0);
    return { count: (finCount || 0) + (actCount || 0) + contactCount + pmtCount };
  });

export const adminListPendingApprovals = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      financials: FarmFinancial[];
      activities: FarmActivity[];
      contactTransactions: PendingContactTransaction[];
      financialPayments: PendingFinancialPayment[];
    }> => {
      await checkOwner(data.passcode);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const [{ data: finRows }, { data: actRows }, contactRes, pmtRes] = await Promise.all([
        supabaseAdmin
          .from("farm_financials")
          .select("*, farm_batches(batch_name)")
          .eq("approval_status", "pending_approval")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("farm_activities")
          .select("*, farm_batches(batch_name)")
          .eq("approval_status", "pending_approval")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("contact_transactions")
          .select("*, special_contacts(contact_name), farm_batches(batch_name)")
          .eq("approval_status", "pending_approval")
          .order("created_at", { ascending: false }),
        (supabaseAdmin as any)
          .from("farm_financial_payments")
          .select("*, farm_financials(party_name, description, type, farm_batches(batch_name))")
          .eq("approval_status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      const financials: FarmFinancial[] = (finRows || []).map(mapFinancialRow);

      const activities: FarmActivity[] = (actRows || []).map(mapActivityRow);

      const contactTransactions: PendingContactTransaction[] = (
        contactRes.error ? [] : contactRes.data || []
      ).map((r: any) => ({
        id: r.id,
        contactId: r.contact_id,
        contactName: r.special_contacts?.contact_name ?? "Special Contact",
        batchId: r.batch_id ?? null,
        batchName: r.farm_batches?.batch_name ?? null,
        transactionType: r.transaction_type,
        transactionDate: r.transaction_date,
        itemDescription: r.item_description,
        totalAmount: Number(r.total_amount || 0),
        amountPaid: Number(r.amount_paid || 0),
        recordedBy: r.recorded_by ?? null,
        approvalStatus: r.approval_status,
        rejectionReason: r.rejection_reason ?? null,
        createdAt: r.created_at,
      }));

      const financialPayments: PendingFinancialPayment[] = (
        pmtRes.error ? [] : pmtRes.data || []
      ).map((r: any) => ({
        id: r.id,
        financialId: r.financial_id,
        paymentDate: r.payment_date,
        amount: Number(r.amount || 0),
        paymentMethod: r.payment_method || "Bank Transfer",
        referenceNo: r.reference_no ?? null,
        notes: r.notes ?? null,
        approvalStatus: r.approval_status || "pending",
        rejectionReason: r.rejection_reason ?? null,
        recordedBy: r.recorded_by ?? null,
        createdAt: r.created_at,
        partyName: r.farm_financials?.party_name ?? null,
        financialDescription: r.farm_financials?.description ?? "Partial Payment",
        financialType: r.farm_financials?.type === "income" ? "income" : "expense",
        batchName: r.farm_financials?.farm_batches?.batch_name ?? null,
      }));

      return { financials, activities, contactTransactions, financialPayments };
    },
  );

async function approvePendingFinancialPayment(supabaseAdmin: any, paymentId: string) {
  const { data: pmt } = await (supabaseAdmin as any)
    .from("farm_financial_payments")
    .select("id, financial_id, amount, approval_status")
    .eq("id", paymentId)
    .maybeSingle();

  if (!pmt || pmt.approval_status === "approved") return;

  const { error: updErr } = await (supabaseAdmin as any)
    .from("farm_financial_payments")
    .update({ approval_status: "approved", rejection_reason: null })
    .eq("id", paymentId);
  if (updErr) throw new Error(updErr.message);

  const { data: fin } = await (supabaseAdmin as any)
    .from("farm_financials")
    .select("id, amount, amount_paid")
    .eq("id", pmt.financial_id)
    .maybeSingle();

  if (fin) {
    const total = Number(fin.amount || 0);
    const currentPaid = fin.amount_paid !== null && fin.amount_paid !== undefined ? Number(fin.amount_paid) : total;
    const nextPaid = Math.min(total, Math.round((currentPaid + Number(pmt.amount || 0)) * 100) / 100);
    await (supabaseAdmin as any)
      .from("farm_financials")
      .update({ amount_paid: nextPaid })
      .eq("id", fin.id);
  }
}

export const adminApproveStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      id: z.string().uuid(),
      targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
    }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.targetType === "fin_payment") {
      await approvePendingFinancialPayment(supabaseAdmin, data.id);
    } else if (data.targetType === "financial") {
      const { error } = await supabaseAdmin
        .from("farm_financials")
        .update({ approval_status: "approved", rejection_reason: null } as any)
        .eq("id", data.id);
      if (error) {
        const { error: fallback } = await supabaseAdmin
          .from("farm_financials")
          .update({ approval_status: "approved" })
          .eq("id", data.id);
        if (fallback) throw new Error(fallback.message);
      }
    } else if (data.targetType === "contact_tx") {
      const { error } = await (supabaseAdmin as any)
        .from("contact_transactions")
        .update({ approval_status: "approved", rejection_reason: null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: act } = await supabaseAdmin
        .from("farm_activities")
        .select("batch_id, mortality_count, approval_status")
        .eq("id", data.id)
        .single();

      const { error } = await supabaseAdmin
        .from("farm_activities")
        .update({ approval_status: "approved", rejection_reason: null } as any)
        .eq("id", data.id);
      if (error) {
        const { error: fallback } = await supabaseAdmin
          .from("farm_activities")
          .update({ approval_status: "approved" })
          .eq("id", data.id);
        if (fallback) throw new Error(fallback.message);
      }

      if (act && act.approval_status !== "approved" && act.batch_id && Number(act.mortality_count || 0) > 0) {
        await adjustBatchHeadcount(supabaseAdmin, act.batch_id, Number(act.mortality_count || 0));
      }
    }

    return { ok: true };
  });

export const adminApproveAllPending = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<{ approvedCount: number }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pendingFin } = await supabaseAdmin
      .from("farm_financials")
      .select("id")
      .eq("approval_status", "pending_approval");

    const { data: pendingAct } = await supabaseAdmin
      .from("farm_activities")
      .select("id, batch_id, mortality_count")
      .eq("approval_status", "pending_approval");

    const pendingContactRes = await supabaseAdmin
      .from("contact_transactions")
      .select("id")
      .eq("approval_status", "pending_approval");

    const pendingPmtRes = await (supabaseAdmin as any)
      .from("farm_financial_payments")
      .select("id")
      .eq("approval_status", "pending");

    const finIds = (pendingFin || []).map((r: any) => r.id);
    const actRows = pendingAct || [];
    const actIds = actRows.map((r: any) => r.id);
    const contactIds = pendingContactRes.error ? [] : (pendingContactRes.data || []).map((r: any) => r.id);
    const pmtIds = pendingPmtRes.error ? [] : (pendingPmtRes.data || []).map((r: any) => r.id);

    if (finIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("farm_financials")
        .update({ approval_status: "approved", rejection_reason: null } as any)
        .in("id", finIds);
      if (error) {
        await supabaseAdmin
          .from("farm_financials")
          .update({ approval_status: "approved" })
          .in("id", finIds);
      }
    }

    if (actIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("farm_activities")
        .update({ approval_status: "approved", rejection_reason: null } as any)
        .in("id", actIds);
      if (error) {
        await supabaseAdmin
          .from("farm_activities")
          .update({ approval_status: "approved" })
          .in("id", actIds);
      }

      const mortByBatch = new Map<string, number>();
      for (const a of actRows as any[]) {
        const m = Number(a.mortality_count || 0);
        if (a.batch_id && m > 0) {
          mortByBatch.set(a.batch_id, (mortByBatch.get(a.batch_id) || 0) + m);
        }
      }
      for (const [bId, delta] of mortByBatch.entries()) {
        await adjustBatchHeadcount(supabaseAdmin, bId, delta);
      }
    }

    if (contactIds.length > 0) {
      await (supabaseAdmin as any)
        .from("contact_transactions")
        .update({ approval_status: "approved", rejection_reason: null })
        .in("id", contactIds);
    }

    for (const pId of pmtIds) {
      await approvePendingFinancialPayment(supabaseAdmin, pId);
    }

    return { approvedCount: finIds.length + actIds.length + contactIds.length + pmtIds.length };
  });

export const adminRejectStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      id: z.string().uuid(),
      targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
      reason: z.string().trim().max(500).optional().nullable(),
    }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table =
      data.targetType === "fin_payment"
        ? "farm_financial_payments"
        : data.targetType === "financial"
          ? "farm_financials"
          : data.targetType === "contact_tx"
            ? "contact_transactions"
            : "farm_activities";

    const reasonText = data.reason?.trim() || "Rejected by Owner";
    const { error } = await (supabaseAdmin as any)
      .from(table)
      .update({ approval_status: "rejected", rejection_reason: reasonText })
      .eq("id", data.id);

    if (error) {
      if (/rejection_reason/i.test(error.message) && table !== "contact_transactions") {
        const { error: fallback } = await (supabaseAdmin as any)
          .from(table)
          .update({ approval_status: "rejected" })
          .eq("id", data.id);
        if (fallback) throw new Error(fallback.message);
        return { ok: true };
      }
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminListMySubmissions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<MySubmissionItem[]> => {
    await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [finRes, actRes, contactRes] = await Promise.all([
      supabaseAdmin
        .from("farm_financials")
        .select("id, type, category, amount, description, transaction_date, approval_status, rejection_reason, created_at, farm_batches(batch_name)")
        .eq("recorded_by", credential.username)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("farm_activities")
        .select("id, activity_type, activity_date, mortality_count, feed_consumed_kg, notes, approval_status, rejection_reason, created_at, farm_batches(batch_name)")
        .eq("recorded_by", credential.username)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("contact_transactions")
        .select("id, transaction_type, item_description, total_amount, transaction_date, approval_status, rejection_reason, created_at, special_contacts(contact_name), farm_batches(batch_name)")
        .eq("recorded_by", credential.username)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const items: MySubmissionItem[] = [];

    for (const r of (finRes.data || []) as any[]) {
      items.push({
        id: r.id,
        targetType: "financial",
        title: `${r.type === "income" ? "Income" : "Expense"} · ${r.category}`,
        subtitle: r.description,
        date: r.transaction_date,
        batchName: r.farm_batches?.batch_name ?? null,
        amount: Number(r.amount || 0),
        approvalStatus: (r.approval_status || "approved") as any,
        rejectionReason: r.rejection_reason ?? null,
        createdAt: r.created_at,
      });
    }

    for (const r of (actRes.data || []) as any[]) {
      items.push({
        id: r.id,
        targetType: "activity",
        title: r.activity_type,
        subtitle:
          [
            r.mortality_count > 0 ? `Mortality: ${r.mortality_count}` : "",
            r.feed_consumed_kg > 0 ? `Feed: ${r.feed_consumed_kg} kg` : "",
            r.notes || "",
          ]
            .filter(Boolean)
            .join(" · ") || "Activity log",
        date: r.activity_date,
        batchName: r.farm_batches?.batch_name ?? null,
        amount: null,
        approvalStatus: (r.approval_status || "approved") as any,
        rejectionReason: r.rejection_reason ?? null,
        createdAt: r.created_at,
      });
    }

    if (!contactRes.error) {
      for (const r of (contactRes.data || []) as any[]) {
        items.push({
          id: r.id,
          targetType: "contact_tx",
          title: `${r.special_contacts?.contact_name || "Contact"} (${r.transaction_type.replace(/_/g, " ")})`,
          subtitle: r.item_description,
          date: r.transaction_date,
          batchName: r.farm_batches?.batch_name ?? null,
          amount: Number(r.total_amount || 0),
          approvalStatus: (r.approval_status || "approved") as any,
          rejectionReason: r.rejection_reason ?? null,
          createdAt: r.created_at,
        });
      }
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

export const adminDismissMySubmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      id: z.string().uuid(),
      targetType: z.enum(["financial", "activity", "contact_tx"]),
    }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table =
      data.targetType === "financial"
        ? "farm_financials"
        : data.targetType === "contact_tx"
          ? "contact_transactions"
          : "farm_activities";

    let query = (supabaseAdmin as any)
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("approval_status", "rejected");
    if (role !== "owner") {
      query = query.eq("recorded_by", credential.username);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function normalizeActivityType(rawType: string): string {
  const lower = (rawType || "").toLowerCase().trim();
  if (lower.includes("mortality") || lower.includes("death") || lower.includes("die")) return "Mortality Record";
  if (lower.includes("egg") || lower.includes("crate")) return "Egg Collection";
  if (lower.includes("feed") || lower.includes("mash") || lower.includes("pellet") || lower.includes("starter") || lower.includes("grower") || lower.includes("finisher")) return "Feeding";
  if (lower.includes("med") || lower.includes("vac") || lower.includes("health") || lower.includes("drug") || lower.includes("vit") || lower.includes("treat")) return "Medication / Vaccination";
  if (lower.includes("weight") || lower.includes("kg") || lower.includes("weigh")) return "Weight Check";
  if (lower.includes("clean") || lower.includes("sanitat") || lower.includes("wash") || lower.includes("disinfect")) return "Cleaning & Sanitation";
  if (lower.includes("pen") || lower.includes("maint") || lower.includes("repair") || lower.includes("house")) return "Pen Maintenance";
  return "General Activity";
}

export const adminImportActivities = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        batchId: z.string().uuid().optional().nullable(),
        activities: z.array(
          z.object({
            activityDate: z.string(),
            activityType: z.string(),
            batchName: z.string().optional().nullable(),
            mortalityCount: z.number().default(0),
            causeOfMortality: z.string().optional().nullable(),
            feedConsumedKg: z.number().default(0),
            eggsCollected: z.number().default(0),
            medicationGiven: z.string().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
        ),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<{ importedCount: number }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Map batch names to IDs if provided
    const { data: batchRows } = await supabaseAdmin.from("farm_batches").select("id, batch_name");
    const batchMap = new Map<string, string>();
    (batchRows ?? []).forEach((b) => batchMap.set(b.batch_name.toLowerCase().trim(), b.id));

    const insertRows = [];
    const mortalityByBatch = new Map<string, number>();
    const validatedOpenBatches = new Set<string>();

    for (const item of data.activities) {
      let resolvedBatchId = data.batchId || null;
      if (!resolvedBatchId && item.batchName) {
        resolvedBatchId = batchMap.get(item.batchName.toLowerCase().trim()) || null;
      }
      if (!resolvedBatchId) {
        throw new Error("Every imported activity row must target an active batch. Please select a default active batch or include a matching Batch name.");
      }
      if (!validatedOpenBatches.has(resolvedBatchId)) {
        await assertBatchOpen(supabaseAdmin, resolvedBatchId);
        validatedOpenBatches.add(resolvedBatchId);
      }

      const mort = Math.max(0, Number(item.mortalityCount || 0));
      if (resolvedBatchId && mort > 0 && isOwner) {
        mortalityByBatch.set(resolvedBatchId, (mortalityByBatch.get(resolvedBatchId) || 0) + mort);
      }

      insertRows.push({
        batch_id: resolvedBatchId,
        activity_date: parseExcelDateSerial(item.activityDate),
        activity_type: normalizeActivityType(item.activityType),
        mortality_count: mort,
        cause_of_mortality: item.causeOfMortality || null,
        feed_consumed_kg: Math.max(0, Number(item.feedConsumedKg || 0)),
        eggs_collected: Math.max(0, Number(item.eggsCollected || 0)),
        medication_given: item.medicationGiven || null,
        notes: item.notes || null,
        approval_status: approvalStatus,
        recorded_by: credential.username,
      });
    }

    if (insertRows.length > 0) {
      const { error } = await supabaseAdmin.from("farm_activities").insert(insertRows);
      if (error) throw new Error(error.message);

      // Deduct mortality from batch current_headcount
      for (const [bId, mortCount] of mortalityByBatch.entries()) {
        const { data: b } = await supabaseAdmin
          .from("farm_batches")
          .select("current_headcount")
          .eq("id", bId)
          .single();
        if (b) {
          const nextCount = Math.max(0, Number(b.current_headcount || 0) - mortCount);
          await supabaseAdmin
            .from("farm_batches")
            .update({ current_headcount: nextCount, updated_at: new Date().toISOString() })
            .eq("id", bId);
        }
      }
    }

    return { importedCount: insertRows.length };
  });

function parseExcelDateSerial(val: any): string {
  if (val === null || val === undefined || val === "") {
    return new Date().toISOString().split("T")[0];
  }
  const str = String(val).trim();
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 70000 && !str.includes("-") && !str.includes("/")) {
    const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split("T")[0];
    }
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}
