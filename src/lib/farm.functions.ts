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
  totalMortality?: number;
  totalBirdsSold?: number;
  startDate: string;
  targetHarvestDate: string | null;
  status: "active" | "completed" | "archived";
  closedAt?: string | null;
  closedBy?: string | null;
  showFinancialsToStaff: boolean;
  fundingPerBird?: number | null;
  allocationRevision?: number;
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
  birdsSold?: number | null;
  recordedBy: string | null;
  recordedByName?: string | null;
  recordedByRole?: "owner" | "manager" | "staff" | null;
  approvalStatus?: "approved" | "pending_approval" | "flagged" | "rejected";
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
  approvalStatus: "pending" | "approved" | "flagged" | "rejected";
  rejectionReason?: string | null;
  recordedBy: string | null;
  recordedByName?: string | null;
  recordedByRole?: "owner" | "manager" | "staff" | null;
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
  status:
    | "New Lead"
    | "Contacted"
    | "Interested / Negotiating"
    | "Converted to Customer"
    | "Lost / Inactive";
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
  recordedByName?: string | null;
  recordedByRole?: "owner" | "manager" | "staff" | null;
  approvalStatus?: "approved" | "pending_approval" | "flagged" | "rejected";
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
  unspecifiedFeedCount?: number;
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
  recordedByName?: string | null;
  recordedByRole?: "owner" | "manager" | "staff" | null;
  approvalStatus: "approved" | "pending_approval" | "flagged" | "rejected";
  rejectionReason?: string | null;
  createdAt: string;
};

export type MySubmissionItem = {
  id: string;
  targetType: "financial" | "activity" | "contact_tx" | "fin_payment";
  title: string;
  subtitle: string;
  date: string;
  batchName: string | null;
  amount: number | null;
  approvalStatus: "approved" | "pending_approval" | "pending" | "flagged" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  financialRecord?: FarmFinancial | null;
  activityRecord?: FarmActivity | null;
};

export type BatchReport = {
  batch: FarmBatch;
  financialsRestricted?: boolean;
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
  showFinancialsToStaff: z.boolean().optional().default(false),
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
  showFinancialsToStaff: z.boolean().optional(),
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
  birdsSold: z.number().int().min(0).max(100000).optional().nullable(),
});

const createLeadSchema = baseAuthSchema.extend({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().max(150).optional().nullable(),
  location: z.string().trim().max(250).optional().nullable(),
  leadSource: z.string().trim().min(1).max(100).default("WhatsApp"),
  interestedIn: z.string().trim().max(200).optional().nullable(),
  status: z
    .enum([
      "New Lead",
      "Contacted",
      "Interested / Negotiating",
      "Converted to Customer",
      "Lost / Inactive",
    ])
    .default("New Lead"),
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

export async function assertFinancialRead(passcode: string, batchId?: string | null) {
  const { requireFinancialAccess } = await import("./financial-access.server");
  const { role } = await requireFinancialAccess(passcode);
  if (role !== "staff") return;
  if (!batchId) throw new Error("Financial reports require Owner or Manager access.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("farm_batches")
    .select("show_financials_to_staff")
    .eq("id", batchId)
    .single();
  if (error || !data?.show_financials_to_staff)
    throw new Error("Financial reports are restricted for this batch.");
}

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

const FLAG_PREFIX = "[FLAGGED FOR CORRECTION] ";

const FEED_BRAND_PATTERNS: Array<[RegExp, string]> = [
  [/\bnew\s*hope\b/i, "New Hope"],
  [/\bultima(?:\s*plus)?\b/i, "Ultima"],
  [/\btop\s*feed\b/i, "TopFeed"],
  [/\bvital\s*(?:feed)?\b/i, "Vital Feed"],
  [/\bchikun\b/i, "Chikun"],
  [/\bolam\b/i, "Olam"],
  [/\bhybrid\b/i, "Hybrid"],
  [/\bpremier\b/i, "Premier"],
  [/\bamo\s*byng\b/i, "Amo Byng"],
  [/\bblue\s*crown\b/i, "Blue Crown"],
  [/\banimal\s*care\b/i, "Animal Care"],
];

export function extractFeedMetadataFromText(description?: string | null): {
  feedBags: number | null;
  feedKgPerBag: number | null;
  feedBrand: string | null;
} {
  const desc = String(description || "").trim();
  if (!desc) return { feedBags: null, feedKgPerBag: null, feedBrand: null };

  let feedBags: number | null = null;
  const bagsMatch = desc.match(/\b(\d+(?:\.\d+)?)\s*(?:bags?|bgs?)\b/i);
  if (bagsMatch) {
    const parsed = parseFloat(bagsMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 5000) {
      feedBags = parsed;
    }
  }

  let feedKgPerBag: number | null = null;
  const kgMatch = desc.match(/\b(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) {
    const parsedKg = parseFloat(kgMatch[1]);
    if (Number.isFinite(parsedKg) && parsedKg >= 5 && parsedKg <= 100) {
      feedKgPerBag = parsedKg;
    }
  }

  let feedBrand: string | null = null;
  for (const [pattern, brandName] of FEED_BRAND_PATTERNS) {
    if (pattern.test(desc)) {
      feedBrand = brandName;
      break;
    }
  }

  return { feedBags, feedKgPerBag, feedBrand };
}

export function extractBirdsSoldFromText(
  category?: string | null,
  description?: string | null,
): number {
  const cat = String(category || "").trim();
  const desc = String(description || "").trim();
  if (!desc) return 0;

  if (/\b(?:eggs?|crates?|manure|dung|litter)\b/i.test(cat)) return 0;
  const isBirdCategory = /bird|offload|broiler|chicken|layer|cockerel|turkey|bulk\s*sale/i.test(
    cat,
  );
  const isGenericIncomeWithBirdDesc =
    /pre-?order|other\s*income|store\s*order/i.test(cat) &&
    /\b(?:birds?|broilers?|chickens?|hens?|cockerels?|layers?|pullets?)\b/i.test(desc) &&
    !/\b(?:eggs?|crates?|manure|dung|litter)\b/i.test(desc);

  if (!isBirdCategory && !isGenericIncomeWithBirdDesc) return 0;

  const patterns = [
    /\b(\d+(?:,\d{3})*)\s*(?:live\s+|dressed\s+|processed\s+|broiler\s+|layer\s+|old\s+layer\s+)?(?:birds?|broilers?|chickens?|hens?|cocks?|cockerels?|layers?|pullets?)\b/i,
    /\bsold\s+(\d+(?:,\d{3})*)\b(?!\s*(?:naira|ngn|k\b|thousand|million|kg|bags?|crates?))/i,
    /\b(\d+(?:,\d{3})*)\s*(?:pcs|pieces|heads?|units?)\b/i,
  ];

  for (const re of patterns) {
    const m = desc.match(re);
    if (m) {
      const count = parseInt(m[1].replace(/,/g, ""), 10);
      if (Number.isFinite(count) && count > 0 && count <= 100000) {
        return count;
      }
    }
  }
  return 0;
}

function countOrderItemBirds(item: any): number {
  const title = String(item?.product || "");
  const option = String(item?.option || "");
  if (/egg|consult/i.test(title) || !/broiler|chicken|bird|dressed|live|layer|hen/i.test(title)) {
    return 0;
  }
  const qty = Math.max(0, Number(item?.qty || 0));
  if (!qty) return 0;
  const optMatch = option.match(/\b(\d+)\s*(?:birds?|chickens?|pcs)\b/i);
  const mult = optMatch ? Math.max(1, parseInt(optMatch[1], 10)) : 1;
  return Math.round(qty * mult);
}

function isBirdPreorderProduct(product?: string | null): boolean {
  const title = String(product || "");
  return (
    Boolean(title) &&
    !/egg|consult/i.test(title) &&
    /broiler|chicken|bird|dressed|live|layer|hen/i.test(title)
  );
}

async function computeBatchLivestockStats(
  supabaseAdmin: any,
  batchIds: string[],
): Promise<
  Map<string, { totalMortality: number; totalBirdsSold: number; totalAdjustments: number }>
> {
  if (!batchIds.length) return new Map();
  const { data, error } = await supabaseAdmin.rpc("batch_stock_summary", { batch_ids: batchIds });
  if (error) throw new Error(`Stock calculation unavailable: ${error.message}`);
  return new Map(
    (data || []).map((r: any) => [
      r.batch_id,
      {
        totalMortality: Number(r.total_mortality),
        totalBirdsSold: Number(r.total_birds_sold),
        totalAdjustments: Number(r.total_adjustments),
      },
    ]),
  );
}

function resolveEffectiveApprovalState(
  rawStatus?: string | null,
  rawReason?: string | null,
): {
  approvalStatus: "approved" | "pending_approval" | "pending" | "flagged" | "rejected";
  rejectionReason: string | null;
} {
  const status = rawStatus || "approved";
  const reason = rawReason || null;
  if (status === "flagged") {
    return {
      approvalStatus: "flagged",
      rejectionReason:
        reason && reason.startsWith(FLAG_PREFIX) ? reason.slice(FLAG_PREFIX.length) : reason,
    };
  }
  if (
    (status === "pending_approval" || status === "pending") &&
    reason &&
    reason.startsWith(FLAG_PREFIX)
  ) {
    return {
      approvalStatus: "flagged",
      rejectionReason: reason.slice(FLAG_PREFIX.length),
    };
  }
  return {
    approvalStatus: status as any,
    rejectionReason: reason,
  };
}

function mapFinancialRow(r: any): FarmFinancial {
  const amount = Number(r.amount || 0);
  const rawPaid = r.amount_paid;
  const amountPaid = rawPaid !== null && rawPaid !== undefined ? Number(rawPaid) : amount;
  const balanceDue = Math.max(0, Math.round((amount - amountPaid) * 100) / 100);
  const paymentStatus: "paid" | "partial" | "unpaid" =
    balanceDue <= 0.005 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
  const resolved = resolveEffectiveApprovalState(
    r.approval_status ?? "approved",
    r.rejection_reason ?? null,
  );

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
    feedKgPerBag:
      r.feed_kg_per_bag !== null && r.feed_kg_per_bag !== undefined
        ? Number(r.feed_kg_per_bag)
        : null,
    feedBrand: r.feed_brand ?? null,
    birdsSold: r.birds_sold !== null && r.birds_sold !== undefined ? Number(r.birds_sold) : null,
    recordedBy: r.recorded_by ?? null,
    approvalStatus: resolved.approvalStatus as any,
    rejectionReason: resolved.rejectionReason,
    createdAt: r.created_at,
  };
}

function mapActivityRow(r: any): FarmActivity {
  const resolved = resolveEffectiveApprovalState(
    r.approval_status ?? "approved",
    r.rejection_reason ?? null,
  );
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
    approvalStatus: resolved.approvalStatus as any,
    rejectionReason: resolved.rejectionReason,
    createdAt: r.created_at,
    sickCount: Number(r.sick_count || 0),
    feedGiven: r.feed_given ?? null,
    feedBrand: r.feed_brand ?? null,
    feedBagNo: r.feed_bag_no !== null && r.feed_bag_no !== undefined ? Number(r.feed_bag_no) : null,
    feedBagStatus:
      r.feed_bag_status === "opened" || r.feed_bag_status === "finished" ? r.feed_bag_status : null,
    feedBagsUsed:
      r.feed_bags_used !== null && r.feed_bags_used !== undefined ? Number(r.feed_bags_used) : null,
    waterGiven: r.water_given ?? null,
    temperature: r.temperature ?? null,
  };
}

function computeAging(
  dueDate: string | null,
  fallbackDate: string,
): { daysOverdue: number; agingBucket: AgingBucket } {
  const refDate = dueDate || fallbackDate;
  if (!refDate) return { daysOverdue: 0, agingBucket: "current" };
  const today = new Date().toISOString().split("T")[0];
  const ms =
    new Date(`${today}T00:00:00Z`).getTime() -
    new Date(`${refDate.slice(0, 10)}T00:00:00Z`).getTime();
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

    const batchList = rows || [];
    const statsMap = await computeBatchLivestockStats(
      supabaseAdmin,
      batchList.map((r: any) => r.id),
    );

    return batchList.map((r: any) => {
      const initial = Number(r.initial_headcount || 0);
      const stats = statsMap.get(r.id) || {
        totalMortality: 0,
        totalBirdsSold: 0,
        totalAdjustments: 0,
      };
      const calculatedHeadcount = Math.max(
        0,
        initial - stats.totalMortality - stats.totalBirdsSold + stats.totalAdjustments,
      );
      const effectiveHeadcount = calculatedHeadcount;

      return {
        id: r.id,
        batchName: r.batch_name,
        batchType: r.batch_type,
        initialHeadcount: initial,
        currentHeadcount: effectiveHeadcount,
        totalMortality: stats.totalMortality,
        totalBirdsSold: stats.totalBirdsSold,
        startDate: r.start_date,
        targetHarvestDate: r.target_harvest_date ?? null,
        status: r.status,
        closedAt: r.closed_at ?? null,
        closedBy: r.closed_by ?? null,
        showFinancialsToStaff: Boolean(r.show_financials_to_staff),
        fundingPerBird: r.funding_per_bird == null ? null : Number(r.funding_per_bird),
        allocationRevision: Number(r.allocation_revision || 0),
        notes: r.notes ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  });

export const adminCreateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createBatchSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const baseInsert = {
      batch_name: data.batchName,
      batch_type: data.batchType,
      initial_headcount: data.initialHeadcount,
      current_headcount: data.initialHeadcount,
      start_date: data.startDate,
      target_harvest_date: data.targetHarvestDate || null,
      notes: data.notes || null,
      status: "active",
    };

    const { data: row, error } = await (supabaseAdmin as any)
      .from("farm_batches")
      .insert({
        ...baseInsert,
        show_financials_to_staff: Boolean(data.showFinancialsToStaff),
      })
      .select("id")
      .single();

    if (error) {
      if (/show_financials_to_staff/i.test(error.message)) {
        const { data: fbRow, error: fbErr } = await supabaseAdmin
          .from("farm_batches")
          .insert(baseInsert)
          .select("id")
          .single();
        if (fbErr) throw new Error(fbErr.message);
        if (!fbRow) throw new Error("Failed to register new farm batch in database.");
        return { id: fbRow.id };
      }
      throw new Error(error.message);
    }
    if (!row) throw new Error("Failed to register new farm batch in database.");
    return { id: row.id };
  });

export const adminUpdateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateBatchSchema.parse(data))
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: previous, error: previousError } = await supabaseAdmin
      .from("farm_batches")
      .select("*")
      .eq("id", data.id)
      .single();
    if (previousError || !previous) throw new Error("Batch not found.");
    const { data: stock, error: stockError } = await (supabaseAdmin as any).rpc(
      "batch_stock_summary",
      { batch_ids: [data.id] },
    );
    if (stockError) throw new Error(stockError.message);
    const expectedStock =
      Number(stock[0].live_birds) + data.initialHeadcount - Number(previous.initial_headcount);
    if (expectedStock < 0)
      throw new Error("Initial headcount cannot be below recorded mortality and sales.");
    if (data.status !== "active" && expectedStock !== 0)
      throw new Error(
        "Use Close Batch to record a reason and reconcile remaining physical stock first.",
      );
    const isClosed = data.status === "completed" || data.status === "archived";
    const baseUpdate = {
      batch_name: data.batchName,
      batch_type: data.batchType,
      initial_headcount: data.initialHeadcount,
      current_headcount: expectedStock,
      status: data.status,
      start_date: data.startDate,
      target_harvest_date: data.targetHarvestDate || null,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabaseAdmin as any)
      .from("farm_batches")
      .update({
        ...baseUpdate,
        closed_at: isClosed ? (previous as any).closed_at || new Date().toISOString() : null,
        closed_by: isClosed ? (previous as any).closed_by || credential.username : null,
        ...(data.showFinancialsToStaff !== undefined
          ? { show_financials_to_staff: data.showFinancialsToStaff }
          : {}),
      })
      .eq("id", data.id);

    if (error) {
      if (/closed_at|closed_by|show_financials_to_staff/i.test(error.message)) {
        const { error: fallbackErr } = await supabaseAdmin
          .from("farm_batches")
          .update(baseUpdate)
          .eq("id", data.id);
        if (fallbackErr) throw new Error(fallbackErr.message);
        return;
      }
      throw new Error(error.message);
    }
  });

export const adminToggleBatchStaffFinancials = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid(), show: z.boolean() }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; showFinancialsToStaff: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await (supabaseAdmin as any)
      .from("farm_batches")
      .update({ show_financials_to_staff: data.show, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (error) {
      if (/show_financials_to_staff/i.test(error.message)) {
        throw new Error(
          "Please run the latest Supabase SQL migration to enable per-batch staff visibility.",
        );
      }
      throw new Error(error.message);
    }
    return { ok: true, showFinancialsToStaff: data.show };
  });

export const adminCloseBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid(),
        reason: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("close_batch_reconciled", {
      batch_id_input: data.id,
      reason_input: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReopenBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data),
  )
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
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("farm_batches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// ─── Financials Server Functions ─────────────────────────────────────────────

async function notifyLinkedBatchPartners(
  supabaseAdmin: any,
  batchId: string | null | undefined,
  actorUsername = "owner",
) {
  if (!batchId) return;
  try {
    const { syncPartnersLinkedToBatch } = await import("./partners.functions");
    await syncPartnersLinkedToBatch(supabaseAdmin, batchId, actorUsername);
  } catch (err: any) {
    console.warn("[notifyLinkedBatchPartners] warning:", err?.message || err);
  }
}

export const adminListFinancials = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema
      .extend({
        batchId: z.string().uuid().optional().nullable(),
        includePending: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<FarmFinancial[]> => {
    const { requireFinancialAccess } = await import("./financial-access.server");
    const { role } = await requireFinancialAccess(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let visibleStaffBatchIds: string[] | null = null;
    if (role === "staff") {
      const { data: openVisRows } = await (supabaseAdmin as any)
        .from("farm_batches")
        .select("id")
        .eq("show_financials_to_staff", true);
      const ids: string[] = (openVisRows || []).map((b: any) => String(b.id));
      visibleStaffBatchIds = ids;
      if (ids.length === 0) return [];
      if (data.batchId && !ids.includes(data.batchId)) return [];
    }

    let query = supabaseAdmin
      .from("farm_financials")
      .select("*, farm_batches(batch_name)")
      .order("transaction_date", { ascending: false });

    if (data.batchId) {
      query = query.eq("batch_id", data.batchId);
    } else if (visibleStaffBatchIds) {
      query = query.in("batch_id", visibleStaffBatchIds);
    }

    if (!data.includePending || role === "staff") {
      query = query.or("approval_status.eq.approved,approval_status.is.null");
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("farm_financials query warning:", error.message);
      return [];
    }

    const lookup = await loadAdminSubmitterLookup(supabaseAdmin);
    return (rows || []).map((r: any) => {
      const mapped = mapFinancialRow(r);
      const meta = mapped.recordedBy
        ? resolveSubmitterMeta(mapped.recordedBy, lookup, "staff")
        : { fullName: "Unknown legacy submitter", role: "staff" as const };
      return {
        ...mapped,
        recordedByName: r.recorded_by_name || meta.fullName,
        recordedByRole: r.recorded_by_role || meta.role,
      };
    });
  });

export const adminCreateFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createFinancialSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";

    const paid =
      data.amountPaid !== null && data.amountPaid !== undefined
        ? Number(data.amountPaid)
        : Number(data.amount);
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

    if (
      data.type === "expense" &&
      data.category === "Feed" &&
      (!(data.feedBags && data.feedBags > 0) || !data.feedBrand?.trim())
    )
      throw new Error("Enter the number of feed bags and brand for this purchase.");
    const parsedFeedFallback =
      data.type === "expense" && data.category === "Feed"
        ? extractFeedMetadataFromText(data.description)
        : { feedBags: null, feedKgPerBag: null, feedBrand: null };
    const finalFeedBags =
      data.feedBags && data.feedBags > 0 ? data.feedBags : parsedFeedFallback.feedBags;
    const finalFeedKg =
      finalFeedBags && finalFeedBags > 0
        ? data.feedKgPerBag || parsedFeedFallback.feedKgPerBag || 25
        : null;
    const finalFeedBrand = data.feedBrand?.trim() || parsedFeedFallback.feedBrand || null;
    const finalBirdsSold =
      data.type === "income"
        ? data.birdsSold !== null && data.birdsSold !== undefined && data.birdsSold >= 0
          ? data.birdsSold
          : extractBirdsSoldFromText(data.category, data.description) || null
        : null;

    const extendedPayload = {
      ...basePayload,
      party_name: data.partyName?.trim() || null,
      due_date: data.dueDate?.trim() || null,
      amount_paid: paid,
      feed_bags: finalFeedBags,
      feed_kg_per_bag: finalFeedKg,
      feed_brand: finalFeedBrand,
      birds_sold: finalBirdsSold,
    };

    let rowId: string | null = null;
    let { data: row, error } = await (supabaseAdmin as any)
      .from("farm_financials")
      .insert(extendedPayload)
      .select("id")
      .single();

    if (error && /birds_sold/i.test(error.message)) {
      const { birds_sold: _omit, ...withoutBirdsSold } = extendedPayload;
      const retry = await (supabaseAdmin as any)
        .from("farm_financials")
        .insert(withoutBirdsSold)
        .select("id")
        .single();
      row = retry.data;
      error = retry.error;
    }

    if (error) {
      if (
        /amount_paid|party_name|due_date|feed_bags|feed_kg_per_bag|feed_brand|birds_sold/i.test(
          error.message,
        )
      ) {
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

    if (isOwner) {
      await notifyLinkedBatchPartners(supabaseAdmin, data.batchId, credential.username);
    }

    return { id: rowId! };
  });

export const adminDeleteFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<void> => {
    await checkOwner(data.passcode);
    const cred = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("farm_financials")
      .select("batch_id, source_contact_id")
      .eq("id", data.id)
      .maybeSingle();

    if ((existing as any)?.source_contact_id)
      throw new Error("Delete or correct the original contact transaction instead.");
    const { error } = await supabaseAdmin.from("farm_financials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (existing?.batch_id) {
      await notifyLinkedBatchPartners(supabaseAdmin, existing.batch_id, cred.username || "owner");
    }
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
  birdsSold: z.number().int().min(0).max(100000).optional().nullable(),
});

export const adminUpdateFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateFinancialSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string; approvalStatus: string }> => {
    const role = await checkPasscode(data.passcode);
    const cred = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";

    if (role === "staff" && data.type !== "expense") {
      throw new Error("Staff accounts can only edit expense entries.");
    }

    const paid =
      data.amountPaid !== null && data.amountPaid !== undefined
        ? Number(data.amountPaid)
        : Number(data.amount);
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

    const { data: prev, error: prevErr } = await supabaseAdmin
      .from("farm_financials")
      .select("batch_id, recorded_by, approval_status, source_contact_id")
      .eq("id", data.id)
      .maybeSingle();

    if (prevErr || !prev) throw new Error("Financial record not found.");

    if ((prev as any).source_contact_id)
      throw new Error(
        "Edit the original contact transaction or order to update its linked financial entry.",
      );
    if (!isOwner) {
      if ((prev.recorded_by || "").trim().toLowerCase() !== cred.username.trim().toLowerCase()) {
        throw new Error("You can only edit financial entries that you recorded.");
      }
      if ((prev.approval_status || "approved") === "approved") {
        throw new Error(
          "Approved financial records are locked and can only be edited by the Farm Owner.",
        );
      }
    }

    if (data.batchId && prev.batch_id !== data.batchId) {
      await assertBatchOpen(supabaseAdmin, data.batchId);
    }

    const baseUpdate: Record<string, any> = {
      batch_id: data.batchId || null,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      payment_method: data.paymentMethod,
      transaction_date: data.transactionDate,
      reference_no: data.referenceNo || null,
    };

    if (!isOwner) {
      baseUpdate.approval_status = "pending_approval";
      baseUpdate.rejection_reason = null;
    }

    const parsedFeedFallback =
      data.type === "expense" && data.category === "Feed"
        ? extractFeedMetadataFromText(data.description)
        : { feedBags: null, feedKgPerBag: null, feedBrand: null };
    const finalFeedBags =
      data.feedBags && data.feedBags > 0 ? data.feedBags : parsedFeedFallback.feedBags;
    const finalFeedKg =
      finalFeedBags && finalFeedBags > 0
        ? data.feedKgPerBag || parsedFeedFallback.feedKgPerBag || 25
        : null;
    const finalFeedBrand = data.feedBrand?.trim() || parsedFeedFallback.feedBrand || null;
    const finalBirdsSold =
      data.type === "income"
        ? data.birdsSold !== null && data.birdsSold !== undefined && data.birdsSold >= 0
          ? data.birdsSold
          : extractBirdsSoldFromText(data.category, data.description) || null
        : null;

    const fullUpdatePayload = {
      ...baseUpdate,
      party_name: data.partyName?.trim() || null,
      due_date: data.dueDate?.trim() || null,
      amount_paid: paid,
      feed_bags: finalFeedBags,
      feed_kg_per_bag: finalFeedKg,
      feed_brand: finalFeedBrand,
      birds_sold: finalBirdsSold,
    };

    let { error } = await (supabaseAdmin as any)
      .from("farm_financials")
      .update(fullUpdatePayload)
      .eq("id", data.id);

    if (error && /birds_sold/i.test(error.message)) {
      const { birds_sold: _omit, ...withoutBirdsSold } = fullUpdatePayload;
      const retry = await (supabaseAdmin as any)
        .from("farm_financials")
        .update(withoutBirdsSold)
        .eq("id", data.id);
      error = retry.error;
    }

    if (error) {
      if (
        /amount_paid|party_name|due_date|feed_bags|feed_kg_per_bag|feed_brand|birds_sold|rejection_reason/i.test(
          error.message,
        )
      ) {
        const cleanFallback = { ...baseUpdate };
        if (/rejection_reason/i.test(error.message)) delete cleanFallback.rejection_reason;
        const { error: fallbackErr } = await supabaseAdmin
          .from("farm_financials")
          .update(cleanFallback)
          .eq("id", data.id);
        if (fallbackErr) throw new Error(fallbackErr.message);
      } else {
        throw new Error(error.message);
      }
    }

    const resultingStatus = isOwner ? prev.approval_status || "approved" : "pending_approval";
    if (isOwner && data.batchId && resultingStatus === "approved") {
      await notifyLinkedBatchPartners(supabaseAdmin, data.batchId, cred.username || "owner");
    }
    return { id: data.id, approvalStatus: resultingStatus };
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
  .handler(
    async ({
      data,
    }): Promise<{ id: string; approvalStatus: "approved" | "pending"; newAmountPaid: number }> => {
      const role = await checkPasscode(data.passcode);
      const credential = parseAdminCredential(data.passcode);
      const isOwner = role === "owner";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: fin, error: finErr } = await (supabaseAdmin as any)
        .from("farm_financials")
        .select("id, batch_id, amount, amount_paid, approval_status, source_contact_id")
        .eq("id", data.financialId)
        .single();

      if (finErr || !fin) throw new Error("Financial transaction not found.");
      if (fin.approval_status && fin.approval_status !== "approved") {
        throw new Error("Approve the original transaction before recording follow-up payments.");
      }

      if (fin.source_contact_id)
        throw new Error("Record this payment in the original contact ledger.");
      const total = Number(fin.amount || 0);
      const currentPaid =
        fin.amount_paid !== null && fin.amount_paid !== undefined ? Number(fin.amount_paid) : total;
      const balance = Math.max(0, Math.round((total - currentPaid) * 100) / 100);
      if (balance <= 0.005) throw new Error("This transaction is already fully paid.");
      if (data.amount > balance + 0.01) {
        throw new Error(
          `Payment amount (₦${data.amount.toLocaleString()}) exceeds remaining balance (₦${balance.toLocaleString()}).`,
        );
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

      if (isOwner)
        await notifyLinkedBatchPartners(supabaseAdmin, fin.batch_id, credential.username);

      return {
        id: pmt.id,
        approvalStatus,
        newAmountPaid: isOwner ? nextPaid : currentPaid,
      };
    },
  );

export const adminListFinancialPayments = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema.extend({ financialId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<FarmFinancialPayment[]> => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: parent, error: parentError } = await (supabaseAdmin as any)
      .from("farm_financials")
      .select("batch_id")
      .eq("id", data.financialId)
      .single();
    if (parentError) throw new Error(parentError.message);
    await assertFinancialRead(data.passcode, parent.batch_id);

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
    await assertFinancialRead(data.passcode, data.batchId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let finQuery = (supabaseAdmin as any)
      .from("farm_financials")
      .select("*, farm_batches(batch_name)")
      .or("approval_status.eq.approved,approval_status.is.null")
      .is("source_contact_id", null)
      .not("amount_paid", "is", null)
      .order("transaction_date", { ascending: false });

    let contactQuery = (supabaseAdmin as any)
      .from("contact_transactions")
      .select("*, special_contacts(contact_name, phone, contact_type), farm_batches(batch_name)")
      .order("transaction_date", { ascending: false });

    if (data.batchId) {
      finQuery = finQuery.eq("batch_id", data.batchId);
      contactQuery = contactQuery.eq("batch_id", data.batchId);
    }

    const [finRes, contactRes] = await Promise.all([finQuery, contactQuery]);
    if (finRes.error) throw new Error(finRes.error.message);
    if (contactRes.error) throw new Error(contactRes.error.message);

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
        if (
          r.transaction_type !== "sale_to_contact" &&
          r.transaction_type !== "purchase_from_supplier"
        )
          continue;

        const kind: "debtor" | "creditor" =
          r.transaction_type === "sale_to_contact" ? "debtor" : "creditor";
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
          category:
            r.transaction_type === "sale_to_contact" ? "Offload Credit Sale" : "Supplier Credit",
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
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), batchId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<BatchReport | null> => {
    await assertFinancialRead(data.passcode, data.batchId);
    const role = await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch batch
    const { data: batchRow, error: bErr } = await supabaseAdmin
      .from("farm_batches")
      .select("*")
      .eq("id", data.batchId)
      .single();

    if (bErr || !batchRow) return null;

    const showFinancialsToStaff = Boolean((batchRow as any).show_financials_to_staff);
    const financialsRestricted = role === "staff" && !showFinancialsToStaff;

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
      showFinancialsToStaff,
      notes: batchRow.notes ?? null,
      createdAt: batchRow.created_at,
      updatedAt: batchRow.updated_at,
    };

    const receiptReport = financialsRestricted
      ? { rows: [] }
      : await (
          await import("./report.functions")
        ).loadReceiptReport({ passcode: data.passcode, batchId: data.batchId });
    const financials: FarmFinancial[] = receiptReport.rows;

    // Fetch activities for batch (approved only)
    const { data: actRows } = await supabaseAdmin
      .from("farm_activities")
      .select("*")
      .eq("batch_id", data.batchId)
      .or("approval_status.eq.approved,approval_status.is.null")
      .order("activity_date", { ascending: true });

    const activities: FarmActivity[] = (actRows || []).map(mapActivityRow);

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
    const statsMap = await computeBatchLivestockStats(supabaseAdmin, [batch.id]);
    const stats = statsMap.get(batch.id) || {
      totalMortality,
      totalBirdsSold: 0,
      totalAdjustments: 0,
    };
    batch.totalMortality = totalMortality;
    batch.totalBirdsSold = stats.totalBirdsSold;
    batch.currentHeadcount = Math.max(
      0,
      batch.initialHeadcount - totalMortality - stats.totalBirdsSold + stats.totalAdjustments,
    );

    return {
      batch,
      financialsRestricted,
      totalIncome: financialsRestricted ? 0 : totalIncome,
      totalExpense: financialsRestricted ? 0 : totalExpense,
      netProfit: financialsRestricted ? 0 : netProfit,
      roiPercentage: financialsRestricted ? 0 : roiPercentage,
      costPerBird: financialsRestricted ? 0 : costPerBird,
      revenuePerBird: financialsRestricted ? 0 : revenuePerBird,
      totalMortality,
      mortalityRatePercentage,
      totalFeedConsumedKg,
      totalEggsCollected,
      expenseByCategory: financialsRestricted ? {} : expenseByCategory,
      incomeByCategory: financialsRestricted ? {} : incomeByCategory,
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
        const existingPhones = new Set(
          (rows || []).map((r: any) => r.phone?.replace(/\D/g, "")).filter(Boolean),
        );
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
            status:
              po.payment_status === "fully_paid" ? "Customer (Converted)" : "December Pre-Order",
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
      .parse(data),
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
      .parse(data),
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
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data),
  )
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
  status: z
    .enum([
      "New Lead",
      "Contacted",
      "Interested / Negotiating",
      "Converted to Customer",
      "Lost / Inactive",
    ])
    .default("New Lead"),
  estimatedValue: z.number().default(0),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

export const adminBatchImportLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        leads: z.array(batchImportLeadItemSchema),
      })
      .parse(data),
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
  .inputValidator((data: unknown) =>
    baseAuthSchema
      .extend({
        batchId: z.string().uuid().optional().nullable(),
        includePending: z.boolean().optional(),
        includeOwnPending: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<FarmActivity[]> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("farm_activities")
      .select("*, farm_batches(batch_name)")
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (data.batchId) {
      query = query.eq("batch_id", data.batchId);
    }

    if (!data.includePending) {
      if (data.includeOwnPending && role !== "owner") {
        const safeUser = (credential.username || "").replace(/[^a-z0-9_.@-]/gi, "");
        if (safeUser) {
          query = query.or(
            `approval_status.eq.approved,approval_status.is.null,recorded_by.ilike.${safeUser}`,
          );
        } else {
          query = query.or("approval_status.eq.approved,approval_status.is.null");
        }
      } else {
        query = query.or("approval_status.eq.approved,approval_status.is.null");
      }
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("farm_activities query warning:", error.message);
      return [];
    }

    const lookup = await loadAdminSubmitterLookup(supabaseAdmin);
    return (rows || []).map((r: any) => {
      const mapped = mapActivityRow(r);
      const meta = mapped.recordedBy
        ? resolveSubmitterMeta(mapped.recordedBy, lookup, "staff")
        : { fullName: "Unknown legacy submitter", role: "staff" as const };
      return {
        ...mapped,
        recordedByName: r.recorded_by_name || meta.fullName,
        recordedByRole: r.recorded_by_role || meta.role,
      };
    });
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

export const adminUpdateActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    createActivitySchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<{ id: string; approvalStatus: string }> => {
    const role = await checkPasscode(data.passcode);
    const cred = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prev, error: prevErr } = await supabaseAdmin
      .from("farm_activities")
      .select("batch_id, mortality_count, approval_status, recorded_by")
      .eq("id", data.id)
      .maybeSingle();

    if (prevErr || !prev) throw new Error("Activity log not found.");

    if (!isOwner) {
      if ((prev.recorded_by || "").trim().toLowerCase() !== cred.username.trim().toLowerCase()) {
        throw new Error("You can only edit activity logs that you recorded.");
      }
      if ((prev.approval_status ?? "approved") === "approved") {
        throw new Error(
          "Approved activity logs are locked and can only be edited by the Farm Owner.",
        );
      }
    }

    if (data.batchId && prev.batch_id !== data.batchId) {
      await assertBatchOpen(supabaseAdmin, data.batchId);
    }

    const baseUpdate: Record<string, any> = {
      batch_id: data.batchId || null,
      activity_date: data.activityDate,
      activity_type: data.activityType,
      mortality_count: data.mortalityCount,
      cause_of_mortality: data.causeOfMortality || null,
      feed_consumed_kg: data.feedConsumedKg,
      eggs_collected: data.eggsCollected,
      medication_given: data.medicationGiven || null,
      notes: data.notes || null,
    };

    if (!isOwner) {
      baseUpdate.approval_status = "pending_approval";
      baseUpdate.rejection_reason = null;
    }

    const { error } = await (supabaseAdmin as any)
      .from("farm_activities")
      .update(baseUpdate)
      .eq("id", data.id);

    if (error) {
      if (/rejection_reason/i.test(error.message)) {
        const clean = { ...baseUpdate };
        delete clean.rejection_reason;
        const retry = await supabaseAdmin.from("farm_activities").update(clean).eq("id", data.id);
        if (retry.error) throw new Error(retry.error.message);
      } else {
        throw new Error(error.message);
      }
    }

    if (isOwner && (prev.approval_status ?? "approved") === "approved" && data.batchId) {
      await adjustBatchHeadcount(
        supabaseAdmin,
        data.batchId,
        data.mortalityCount - Number(prev.mortality_count || 0),
      );
    }

    const resultingStatus = isOwner ? prev.approval_status || "approved" : "pending_approval";
    return { id: data.id, approvalStatus: resultingStatus };
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

async function adjustBatchHeadcount(supabaseAdmin: any, batchId: string, _delta: number) {
  const { data, error } = await supabaseAdmin.rpc("batch_stock_summary", { batch_ids: [batchId] });
  if (error) throw new Error(error.message);
  const { error: updateError } = await supabaseAdmin
    .from("farm_batches")
    .update({
      current_headcount: Math.max(0, Number(data?.[0]?.live_birds || 0)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);
  if (updateError) throw new Error(updateError.message);
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
    if (isOwner)
      await notifyLinkedBatchPartners(
        supabaseAdmin,
        data.batchId,
        parseAdminCredential(data.passcode).username,
      );
    return { id: row.id, approvalStatus };
  });

export const adminUpdateDailyLog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dailyLogSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; approvalStatus: string }> => {
    const role = await checkPasscode(data.passcode);
    const cred = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertBatchOpen(supabaseAdmin, data.batchId);

    const { data: prev, error: prevErr } = await supabaseAdmin
      .from("farm_activities")
      .select("mortality_count, approval_status, recorded_by")
      .eq("id", data.id)
      .single();
    if (prevErr || !prev) throw new Error("Daily Log not found.");

    if (!isOwner) {
      if ((prev.recorded_by || "").trim().toLowerCase() !== cred.username.trim().toLowerCase()) {
        throw new Error("You can only edit daily logs that you submitted.");
      }
      if ((prev.approval_status ?? "approved") === "approved") {
        throw new Error("Approved daily logs are locked and can only be edited by the Farm Owner.");
      }
    }

    const rowPayload: Record<string, any> = dailyLogRow(data, true);
    if (!isOwner) {
      rowPayload.approval_status = "pending_approval";
      rowPayload.rejection_reason = null;
    }

    let { error } = await (supabaseAdmin as any)
      .from("farm_activities")
      .update(rowPayload)
      .eq("id", data.id);

    if (
      error &&
      /feed_bag_no|feed_bag_status|feed_bags_used|rejection_reason/i.test(error.message)
    ) {
      const fallbackPayload: Record<string, any> = dailyLogRow(
        data,
        !/feed_bag_no|feed_bag_status|feed_bags_used/i.test(error.message),
      );
      if (!isOwner) {
        fallbackPayload.approval_status = "pending_approval";
        if (!/rejection_reason/i.test(error.message)) fallbackPayload.rejection_reason = null;
      }
      const retry = await (supabaseAdmin as any)
        .from("farm_activities")
        .update(fallbackPayload)
        .eq("id", data.id);
      error = retry.error;
    }
    if (error) throw new Error(error.message);

    // Headcount was only deducted once the log was approved; adjust by the difference.
    if (isOwner && (prev.approval_status ?? "approved") === "approved") {
      await adjustBatchHeadcount(
        supabaseAdmin,
        data.batchId,
        data.mortalityCount - Number(prev.mortality_count || 0),
      );
    }
    if (isOwner)
      await notifyLinkedBatchPartners(
        supabaseAdmin,
        data.batchId,
        parseAdminCredential(data.passcode).username,
      );
    const resultingStatus = isOwner ? prev.approval_status || "approved" : "pending_approval";
    return { ok: true, approvalStatus: resultingStatus };
  });

export const adminGetBatchFeedLedger = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema.extend({ batchId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<BatchFeedLedger> => {
    await assertFinancialRead(data.passcode, data.batchId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [feedResult, activityResult] = await Promise.all([
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

    if (feedResult.error) throw new Error(feedResult.error.message);
    if (activityResult.error) throw new Error(activityResult.error.message);
    const finRows = feedResult.data;
    const actRows = activityResult.data;
    let knownFeedSpend = 0;
    let bagsBought = 0;
    let totalKgBought = 0;
    let totalFeedSpend = 0;
    let unspecifiedFeedCount = 0;
    const brandMap = new Map<string, { brand: string; bagsBought: number; spend: number }>();

    for (const r of finRows || []) {
      const amt = Number(r.amount || 0);
      totalFeedSpend += amt;
      const parsedFallback = extractFeedMetadataFromText(r.description);
      const explicitBags =
        r.feed_bags !== null && r.feed_bags !== undefined ? Number(r.feed_bags) : 0;
      const bags = explicitBags > 0 ? explicitBags : 0;
      const explicitKg =
        r.feed_kg_per_bag !== null && r.feed_kg_per_bag !== undefined
          ? Number(r.feed_kg_per_bag)
          : 0;
      const kgPerBag = explicitKg > 0 ? explicitKg : parsedFallback.feedKgPerBag || 25;
      if (bags > 0) {
        knownFeedSpend += amt;
        bagsBought += bags;
        totalKgBought += bags * kgPerBag;
      } else {
        unspecifiedFeedCount++;
      }
      const rawBrand = (r.feed_brand || parsedFallback.feedBrand || "").trim();
      const brandLabel = rawBrand || (bags > 0 ? "Brand Not Specified" : "Unspecified Feed");
      const prev = brandMap.get(brandLabel) || { brand: brandLabel, bagsBought: 0, spend: 0 };
      prev.bagsBought += bags;
      prev.spend += amt;
      brandMap.set(brandLabel, prev);
    }

    const defaultKgPerBag =
      bagsBought > 0 ? Math.round((totalKgBought / bagsBought) * 10) / 10 : 25;
    const avgCostPerBag =
      bagsBought > 0 ? Math.round((knownFeedSpend / bagsBought) * 100) / 100 : 0;

    let totalKgUsed = 0;
    let bagsFinished = 0;
    let currentOpenBagNo: number | null = null;
    let lastEntry: BatchFeedLedger["lastEntry"] = null;

    for (const a of actRows || []) {
      totalKgUsed += Number(a.feed_consumed_kg || 0);
      const bagNo =
        a.feed_bag_no !== null && a.feed_bag_no !== undefined ? Number(a.feed_bag_no) : null;
      const bagStatus =
        a.feed_bag_status === "opened" || a.feed_bag_status === "finished"
          ? a.feed_bag_status
          : null;
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
      unspecifiedFeedCount,
    };
  });

export const adminDeleteActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data),
  )
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
          }),
        ),
      })
      .parse(data),
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
            return (
              p.length >= 7 &&
              normPhone.length >= 7 &&
              (p.endsWith(normPhone) || normPhone.endsWith(p))
            );
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
            matchedDetails.push(
              `Matched '${item.customerName || item.customerPhone}' -> Order #${matchedOrderCode}`,
            );

            // Automatically link website order to the specified farm batch if selected and approved by owner
            if (data.batchId && isOwner) {
              const table = isPreorder ? "preorders" : "orders";
              await supabaseAdmin
                .from(table)
                .update({ batch_id: data.batchId })
                .eq("id", matchedOrderId);
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
    },
  );

// ─── Staff & Manager Approvals Management Server Functions ───────────────────

export type PendingApprovalSubmitterSummary = {
  username: string;
  fullName: string;
  role: "owner" | "manager" | "staff";
  count: number;
};

export type PendingApprovalAlertItem = {
  id: string;
  targetType: "financial" | "activity" | "contact_tx" | "fin_payment";
  title: string;
  subtitle: string;
  date: string;
  submitterUsername: string;
  submitterName: string;
  submitterRole: "owner" | "manager" | "staff";
  createdAt: string;
};

export type PendingApprovalsSummary = {
  count: number;
  managerCount: number;
  staffCount: number;
  partnerPendingCount: number;
  submitters: PendingApprovalSubmitterSummary[];
  recentItems: PendingApprovalAlertItem[];
};

async function loadAdminSubmitterLookup(
  supabaseAdmin: any,
): Promise<
  Map<string, { username: string; fullName: string; role: "owner" | "manager" | "staff" }>
> {
  const map = new Map<
    string,
    { username: string; fullName: string; role: "owner" | "manager" | "staff" }
  >();
  try {
    const { data: rows } = await supabaseAdmin
      .from("admin_access")
      .select("username, full_name, role");
    for (const r of rows || []) {
      const uname = String(r.username || "")
        .trim()
        .toLowerCase();
      if (!uname) continue;
      const resolvedRole: "owner" | "manager" | "staff" =
        r.role === "owner" || r.role === "manager" || r.role === "staff" ? r.role : "staff";
      const display = String(r.full_name || "").trim() || uname;
      map.set(uname, { username: uname, fullName: display, role: resolvedRole });
    }
  } catch {
    // Graceful fallback when admin_access is unavailable
  }
  return map;
}

function resolveSubmitterMeta(
  recordedBy: string | null | undefined,
  lookup: Map<string, { username: string; fullName: string; role: "owner" | "manager" | "staff" }>,
  defaultRole: "manager" | "staff" = "staff",
): { username: string; fullName: string; role: "owner" | "manager" | "staff" } {
  const raw = String(recordedBy || "").trim();
  const key = raw.toLowerCase();
  if (key && lookup.has(key)) {
    return lookup.get(key)!;
  }
  if (key === "owner" || key === "admin") {
    return { username: key, fullName: "Farm Owner", role: "owner" };
  }
  if (key === "manager") {
    return { username: "manager", fullName: "Farm Manager", role: "manager" };
  }
  if (key === "owner" || key === "admin") {
    return { username: key, fullName: "Farm Owner", role: "owner" };
  }
  if (!key) {
    return {
      username: defaultRole,
      fullName: "Unknown legacy submitter",
      role: defaultRole,
    };
  }
  return {
    username: raw,
    fullName: raw,
    role: defaultRole,
  };
}

async function fetchEnrichedApprovalsByStatus(supabaseAdmin: any, statuses: string[], limit = 200) {
  const [
    lookup,
    { data: finRows },
    { data: actRows },
    contactRes,
    pmtRes,
    partnerFinRes,
    partnerActRes,
  ] = await Promise.all([
    loadAdminSubmitterLookup(supabaseAdmin),
    supabaseAdmin
      .from("farm_financials")
      .select("*, farm_batches(batch_name)")
      .is("source_contact_id", null)
      .in("approval_status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("farm_activities")
      .select("*, farm_batches(batch_name)")
      .in("approval_status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("contact_transactions")
      .select("*, special_contacts(contact_name), farm_batches(batch_name)")
      .in("approval_status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit),
    (supabaseAdmin as any)
      .from("farm_financial_payments")
      .select("*, farm_financials(party_name, description, type, farm_batches(batch_name))")
      .in("approval_status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("partner_financials")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_approval")
      .is("removed_at", null),
    supabaseAdmin
      .from("partner_activities")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_approval")
      .is("removed_at", null),
  ]);

  const financials: FarmFinancial[] = (finRows || []).map((r: any) => {
    const mapped = mapFinancialRow(r);
    const meta = resolveSubmitterMeta(mapped.recordedBy, lookup, "staff");
    return {
      ...mapped,
      recordedByName: r.recorded_by_name || meta.fullName,
      recordedByRole: meta.role,
    };
  });

  const activities: FarmActivity[] = (actRows || []).map((r: any) => {
    const mapped = mapActivityRow(r);
    const meta = resolveSubmitterMeta(mapped.recordedBy, lookup, "staff");
    return {
      ...mapped,
      recordedByName: r.recorded_by_name || meta.fullName,
      recordedByRole: meta.role,
    };
  });

  const contactTransactions: PendingContactTransaction[] = (
    contactRes.error ? [] : contactRes.data || []
  ).map((r: any) => {
    const meta = resolveSubmitterMeta(r.recorded_by, lookup, "manager");
    const resolved = resolveEffectiveApprovalState(r.approval_status, r.rejection_reason ?? null);
    return {
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
      recordedByName: r.recorded_by_name || meta.fullName,
      recordedByRole: r.recorded_by_role || meta.role,
      approvalStatus: resolved.approvalStatus as any,
      rejectionReason: resolved.rejectionReason,
      createdAt: r.created_at,
    };
  });

  const financialPayments: PendingFinancialPayment[] = (pmtRes.error ? [] : pmtRes.data || []).map(
    (r: any) => {
      const meta = resolveSubmitterMeta(r.recorded_by, lookup, "staff");
      const resolved = resolveEffectiveApprovalState(
        r.approval_status || "pending",
        r.rejection_reason ?? null,
      );
      return {
        id: r.id,
        financialId: r.financial_id,
        paymentDate: r.payment_date,
        amount: Number(r.amount || 0),
        paymentMethod: r.payment_method || "Bank Transfer",
        referenceNo: r.reference_no ?? null,
        notes: r.notes ?? null,
        approvalStatus: resolved.approvalStatus as any,
        rejectionReason: resolved.rejectionReason,
        recordedBy: r.recorded_by ?? null,
        recordedByName: r.recorded_by_name || meta.fullName,
        recordedByRole: r.recorded_by_role || meta.role,
        createdAt: r.created_at,
        partyName: r.farm_financials?.party_name ?? null,
        financialDescription: r.farm_financials?.description ?? "Partial Payment",
        financialType: r.farm_financials?.type === "income" ? "income" : "expense",
        batchName: r.farm_financials?.farm_batches?.batch_name ?? null,
      };
    },
  );

  const partnerPendingCount =
    (partnerFinRes.error ? 0 : partnerFinRes.count || 0) +
    (partnerActRes.error ? 0 : partnerActRes.count || 0);

  return { financials, activities, contactTransactions, financialPayments, partnerPendingCount };
}

export const adminGetPendingApprovalsCount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<PendingApprovalsSummary> => {
    const role = await checkPasscode(data.passcode);
    if (role !== "owner") {
      return {
        count: 0,
        managerCount: 0,
        staffCount: 0,
        partnerPendingCount: 0,
        submitters: [],
        recentItems: [],
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { financials, activities, contactTransactions, financialPayments, partnerPendingCount } =
      await fetchEnrichedApprovalsByStatus(supabaseAdmin, ["pending_approval", "pending"]);

    // Exclude flagged records waiting on staff/manager edits from the Owner's urgent action count
    const pendingFin = financials.filter((f) => f.approvalStatus !== "flagged");
    const pendingAct = activities.filter((a) => a.approvalStatus !== "flagged");
    const pendingContact = contactTransactions.filter((c) => c.approvalStatus !== "flagged");
    const pendingPmt = financialPayments.filter((p) => p.approvalStatus !== "flagged");

    const recentItems: PendingApprovalAlertItem[] = [
      ...pendingFin.map((f) => ({
        id: f.id,
        targetType: "financial" as const,
        title: `${f.type === "income" ? "Income" : "Expense"} · ${f.category} (₦${f.amount.toLocaleString()})`,
        subtitle: `${f.description}${f.batchName ? ` · ${f.batchName}` : ""}`,
        date: f.transactionDate,
        submitterUsername: f.recordedBy || "staff",
        submitterName: f.recordedByName || f.recordedBy || "Staff",
        submitterRole: (f.recordedByRole || "staff") as "owner" | "manager" | "staff",
        createdAt: f.createdAt,
      })),
      ...pendingAct.map((a) => ({
        id: a.id,
        targetType: "activity" as const,
        title: `${a.activityType}${a.mortalityCount > 0 ? ` · ${a.mortalityCount} mortality` : ""}`,
        subtitle: `${a.batchName || "Pen Log"}${a.notes ? ` · ${a.notes}` : ""}`,
        date: a.activityDate,
        submitterUsername: a.recordedBy || "staff",
        submitterName: a.recordedByName || a.recordedBy || "Staff",
        submitterRole: (a.recordedByRole || "staff") as "owner" | "manager" | "staff",
        createdAt: a.createdAt,
      })),
      ...pendingContact.map((c) => ({
        id: c.id,
        targetType: "contact_tx" as const,
        title: `${c.contactName} (₦${c.totalAmount.toLocaleString()})`,
        subtitle: `${c.itemDescription}${c.batchName ? ` · ${c.batchName}` : ""}`,
        date: c.transactionDate,
        submitterUsername: c.recordedBy || "manager",
        submitterName: c.recordedByName || c.recordedBy || "Manager",
        submitterRole: (c.recordedByRole || "manager") as "owner" | "manager" | "staff",
        createdAt: c.createdAt,
      })),
      ...pendingPmt.map((p) => ({
        id: p.id,
        targetType: "fin_payment" as const,
        title: `Credit Payment · ₦${p.amount.toLocaleString()}`,
        subtitle: `${p.partyName || p.financialDescription}${p.batchName ? ` · ${p.batchName}` : ""}`,
        date: p.paymentDate,
        submitterUsername: p.recordedBy || "staff",
        submitterName: p.recordedByName || p.recordedBy || "Staff",
        submitterRole: (p.recordedByRole || "staff") as "owner" | "manager" | "staff",
        createdAt: p.createdAt,
      })),
    ].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    let managerCount = 0;
    let staffCount = 0;
    const submitterMap = new Map<string, PendingApprovalSubmitterSummary>();
    for (const item of recentItems) {
      if (item.submitterRole === "manager") managerCount++;
      else if (item.submitterRole === "staff") staffCount++;
      const key = `${item.submitterRole}:${item.submitterUsername.toLowerCase()}`;
      const existing = submitterMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        submitterMap.set(key, {
          username: item.submitterUsername,
          fullName: item.submitterName,
          role: item.submitterRole,
          count: 1,
        });
      }
    }

    return {
      count: recentItems.length,
      managerCount,
      staffCount,
      partnerPendingCount,
      submitters: Array.from(submitterMap.values()).sort((a, b) => b.count - a.count),
      recentItems: recentItems.slice(0, 12),
    };
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
      partnerPendingCount: number;
    }> => {
      await checkOwner(data.passcode);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      return fetchEnrichedApprovalsByStatus(supabaseAdmin, [
        "pending_approval",
        "pending",
        "flagged",
      ]);
    },
  );

export const adminListRejectedApprovals = createServerFn({ method: "POST" })
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
      const res = await fetchEnrichedApprovalsByStatus(supabaseAdmin, ["rejected"], 100);
      return {
        financials: res.financials,
        activities: res.activities,
        contactTransactions: res.contactTransactions,
        financialPayments: res.financialPayments,
      };
    },
  );

export const adminListApprovalsByFilter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseAuthSchema
      .extend({
        statusFilter: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
        limit: z.number().int().min(10).max(500).default(250),
      })
      .parse(data),
  )
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

      const statuses =
        data.statusFilter === "pending"
          ? ["pending_approval", "pending", "flagged"]
          : data.statusFilter === "approved"
            ? ["approved"]
            : data.statusFilter === "rejected"
              ? ["rejected"]
              : ["pending_approval", "pending", "flagged", "approved", "rejected"];

      const res = await fetchEnrichedApprovalsByStatus(supabaseAdmin, statuses, data.limit);

      // For Approved History (and approved entries inside "All"), focus on Staff & Manager submissions
      // so Owner-self-logged records don't clutter the Staff/Manager Approval Audit Log.
      const keepRecord = (
        status: string | undefined | null,
        recordedBy: string | null | undefined,
        role: string | null | undefined,
      ) => {
        if ((status || "approved") !== "approved") return true;
        return Boolean(recordedBy && recordedBy.trim()) && role !== "owner";
      };

      return {
        financials: res.financials.filter((f) =>
          keepRecord(f.approvalStatus, f.recordedBy, f.recordedByRole),
        ),
        activities: res.activities.filter((a) =>
          keepRecord(a.approvalStatus, a.recordedBy, a.recordedByRole),
        ),
        contactTransactions: res.contactTransactions.filter((c) =>
          keepRecord(c.approvalStatus, c.recordedBy, c.recordedByRole),
        ),
        financialPayments: res.financialPayments.filter((p) =>
          keepRecord(p.approvalStatus, p.recordedBy, p.recordedByRole),
        ),
      };
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
}

export const adminApproveStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid(),
        targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const cred = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.targetType === "fin_payment") {
      await approvePendingFinancialPayment(supabaseAdmin, data.id);
    } else if (data.targetType === "financial") {
      const { data: fin } = await supabaseAdmin
        .from("farm_financials")
        .select("batch_id")
        .eq("id", data.id)
        .maybeSingle();

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

      if (fin?.batch_id) {
        await notifyLinkedBatchPartners(supabaseAdmin, fin.batch_id, cred.username || "owner");
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

      if (
        act &&
        act.approval_status !== "approved" &&
        act.batch_id &&
        Number(act.mortality_count || 0) > 0
      ) {
        await adjustBatchHeadcount(supabaseAdmin, act.batch_id, Number(act.mortality_count || 0));
      }
      if (act?.batch_id) {
        await notifyLinkedBatchPartners(supabaseAdmin, act.batch_id, cred.username || "owner");
      }
    }

    return { ok: true };
  });

export const adminApproveAllPending = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<{ approvedCount: number }> => {
    await checkOwner(data.passcode);
    const cred = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pendingFin } = await supabaseAdmin
      .from("farm_financials")
      .select("id, batch_id, rejection_reason")
      .is("source_contact_id", null)
      .in("approval_status", ["pending_approval", "pending"]);

    const { data: pendingAct } = await supabaseAdmin
      .from("farm_activities")
      .select("id, batch_id, mortality_count, rejection_reason")
      .in("approval_status", ["pending_approval", "pending"]);

    const pendingContactRes = await supabaseAdmin
      .from("contact_transactions")
      .select("id, rejection_reason")
      .in("approval_status", ["pending_approval", "pending"]);

    const pendingPmtRes = await (supabaseAdmin as any)
      .from("farm_financial_payments")
      .select("id, rejection_reason")
      .in("approval_status", ["pending", "pending_approval"]);

    const notFlagged = (r: any) => !String(r?.rejection_reason || "").startsWith(FLAG_PREFIX);
    const finIds = (pendingFin || []).filter(notFlagged).map((r: any) => r.id);
    const actRows = (pendingAct || []).filter(notFlagged);
    const actIds = actRows.map((r: any) => r.id);
    const contactIds = pendingContactRes.error
      ? []
      : (pendingContactRes.data || []).filter(notFlagged).map((r: any) => r.id);
    const pmtIds = pendingPmtRes.error
      ? []
      : (pendingPmtRes.data || []).filter(notFlagged).map((r: any) => r.id);

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

    const touchedBatchIds = new Set<string>();
    for (const r of (pendingFin || []) as any[]) {
      if (r.batch_id) touchedBatchIds.add(r.batch_id);
    }
    for (const r of (actRows || []) as any[]) {
      if (r.batch_id) touchedBatchIds.add(r.batch_id);
    }
    for (const bId of touchedBatchIds) {
      await notifyLinkedBatchPartners(supabaseAdmin, bId, cred.username || "owner");
    }

    return { approvedCount: finIds.length + actIds.length + contactIds.length + pmtIds.length };
  });

export const adminRejectStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid(),
        targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
        reason: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
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

export const adminFlagStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid(),
        targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
        note: z
          .string()
          .trim()
          .min(1, "Please add a short note explaining what needs editing.")
          .max(500),
      })
      .parse(data),
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

    const noteText = data.note.trim();
    const { error } = await (supabaseAdmin as any)
      .from(table)
      .update({ approval_status: "flagged", rejection_reason: noteText })
      .eq("id", data.id);

    if (error) {
      if (/check|constraint|approval_status/i.test(error.message)) {
        const fallbackStatus = data.targetType === "fin_payment" ? "pending" : "pending_approval";
        const { error: fallback } = await (supabaseAdmin as any)
          .from(table)
          .update({
            approval_status: fallbackStatus,
            rejection_reason: `${FLAG_PREFIX}${noteText}`,
          })
          .eq("id", data.id);
        if (fallback) throw new Error(fallback.message);
        return { ok: true };
      }
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminDeleteRejectedRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid(),
        targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
      })
      .parse(data),
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

    const { error } = await (supabaseAdmin as any)
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("approval_status", "rejected");
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const adminListMySubmissions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<MySubmissionItem[]> => {
    await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const usernamePattern = (credential.username || "").trim();
    if (!usernamePattern) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [finRes, actRes, contactRes, finPmtRes] = await Promise.all([
      supabaseAdmin
        .from("farm_financials")
        .select("*, farm_batches(batch_name)")
        .eq("recorded_by", usernamePattern)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("farm_activities")
        .select("*, farm_batches(batch_name)")
        .eq("recorded_by", usernamePattern)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("contact_transactions")
        .select(
          "id, transaction_type, item_description, total_amount, transaction_date, approval_status, rejection_reason, created_at, special_contacts(contact_name), farm_batches(batch_name)",
        )
        .eq("recorded_by", usernamePattern)
        .order("created_at", { ascending: false })
        .limit(200),
      (supabaseAdmin as any)
        .from("farm_financial_payments")
        .select(
          "id, amount, payment_date, payment_method, notes, approval_status, rejection_reason, created_at, farm_financials(party_name, description, farm_batches(batch_name))",
        )
        .eq("recorded_by", usernamePattern)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const items: MySubmissionItem[] = [];

    for (const r of (finRes.data || []) as any[]) {
      const finMapped = mapFinancialRow(r);
      items.push({
        id: r.id,
        targetType: "financial",
        title: `${r.type === "income" ? "Income" : "Expense"} · ${r.category}`,
        subtitle: r.description,
        date: r.transaction_date,
        batchName: finMapped.batchName ?? null,
        amount: Number(r.amount || 0),
        approvalStatus: finMapped.approvalStatus as any,
        rejectionReason: finMapped.rejectionReason ?? null,
        createdAt: r.created_at,
        financialRecord: finMapped,
      });
    }

    for (const r of (actRes.data || []) as any[]) {
      const actMapped = mapActivityRow(r);
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
        batchName: actMapped.batchName ?? null,
        amount: null,
        approvalStatus: actMapped.approvalStatus as any,
        rejectionReason: actMapped.rejectionReason ?? null,
        createdAt: r.created_at,
        activityRecord: actMapped,
      });
    }

    if (!contactRes.error) {
      for (const r of (contactRes.data || []) as any[]) {
        const resolved = resolveEffectiveApprovalState(
          r.approval_status || "approved",
          r.rejection_reason ?? null,
        );
        items.push({
          id: r.id,
          targetType: "contact_tx",
          title: `${r.special_contacts?.contact_name || "Contact"} (${r.transaction_type.replace(/_/g, " ")})`,
          subtitle: r.item_description,
          date: r.transaction_date,
          batchName: r.farm_batches?.batch_name ?? null,
          amount: Number(r.total_amount || 0),
          approvalStatus: resolved.approvalStatus as any,
          rejectionReason: resolved.rejectionReason,
          createdAt: r.created_at,
        });
      }
    }

    if (!finPmtRes.error) {
      for (const r of (finPmtRes.data || []) as any[]) {
        const resolved = resolveEffectiveApprovalState(
          r.approval_status || "approved",
          r.rejection_reason ?? null,
        );
        const party = r.farm_financials?.party_name ? `${r.farm_financials.party_name} — ` : "";
        items.push({
          id: r.id,
          targetType: "fin_payment",
          title: `Credit / Follow-up Payment (${r.payment_method || "Transfer"})`,
          subtitle: `${party}${r.farm_financials?.description || r.notes || "Partial Payment"}`,
          date: r.payment_date,
          batchName: r.farm_financials?.farm_batches?.batch_name ?? null,
          amount: Number(r.amount || 0),
          approvalStatus: resolved.approvalStatus as any,
          rejectionReason: resolved.rejectionReason,
          createdAt: r.created_at,
        });
      }
    }

    const { data: dismissals, error: dismissalError } = await (supabaseAdmin as any)
      .from("submission_dismissals")
      .select("source_id")
      .eq("username", credential.username);
    if (dismissalError) throw new Error(dismissalError.message);
    const hidden = new Set((dismissals || []).map((d: { source_id: string }) => d.source_id));
    return items
      .filter((item) => item.approvalStatus !== "rejected" || !hidden.has(item.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

export const adminDismissMySubmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid(),
        targetType: z.enum(["financial", "activity", "contact_tx", "fin_payment"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table =
      data.targetType === "fin_payment"
        ? "farm_financial_payments"
        : data.targetType === "financial"
          ? "farm_financials"
          : data.targetType === "contact_tx"
            ? "contact_transactions"
            : "farm_activities";

    const { data: record, error: recordError } = await (supabaseAdmin as any)
      .from(table)
      .select("recorded_by, approval_status")
      .eq("id", data.id)
      .single();
    if (recordError) throw new Error(recordError.message);
    if (
      record.approval_status !== "rejected" ||
      (role !== "owner" && record.recorded_by?.toLowerCase() !== credential.username)
    )
      throw new Error("Cannot dismiss this record.");
    const { error } = await (supabaseAdmin as any)
      .from("submission_dismissals")
      .upsert({ username: credential.username, source_table: table, source_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function normalizeActivityType(rawType: string): string {
  const lower = (rawType || "").toLowerCase().trim();
  if (lower.includes("mortality") || lower.includes("death") || lower.includes("die"))
    return "Mortality Record";
  if (lower.includes("egg") || lower.includes("crate")) return "Egg Collection";
  if (
    lower.includes("feed") ||
    lower.includes("mash") ||
    lower.includes("pellet") ||
    lower.includes("starter") ||
    lower.includes("grower") ||
    lower.includes("finisher")
  )
    return "Feeding";
  if (
    lower.includes("med") ||
    lower.includes("vac") ||
    lower.includes("health") ||
    lower.includes("drug") ||
    lower.includes("vit") ||
    lower.includes("treat")
  )
    return "Medication / Vaccination";
  if (lower.includes("weight") || lower.includes("kg") || lower.includes("weigh"))
    return "Weight Check";
  if (
    lower.includes("clean") ||
    lower.includes("sanitat") ||
    lower.includes("wash") ||
    lower.includes("disinfect")
  )
    return "Cleaning & Sanitation";
  if (
    lower.includes("pen") ||
    lower.includes("maint") ||
    lower.includes("repair") ||
    lower.includes("house")
  )
    return "Pen Maintenance";
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
          }),
        ),
      })
      .parse(data),
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
        throw new Error(
          "Every imported activity row must target an active batch. Please select a default active batch or include a matching Batch name.",
        );
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
