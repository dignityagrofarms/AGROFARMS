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
  description: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNo: string | null;
  recordedBy: string | null;
  approvalStatus?: "approved" | "pending_approval" | "rejected";
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
    | "General Activity";
  mortalityCount: number;
  causeOfMortality: string | null;
  feedConsumedKg: number;
  eggsCollected: number;
  medicationGiven: string | null;
  notes: string | null;
  recordedBy: string | null;
  approvalStatus?: "approved" | "pending_approval" | "rejected";
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
  batchId: z.string().uuid().optional().nullable(),
  type: z.enum(["expense", "income"]),
  category: z.string().trim().min(1).max(100),
  amount: z.number().min(0),
  description: z.string().trim().min(1).max(500),
  paymentMethod: z.string().trim().min(1).max(100).default("Bank Transfer"),
  transactionDate: z.string().trim().min(1),
  referenceNo: z.string().trim().max(100).optional().nullable(),
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
  batchId: z.string().uuid().optional().nullable(),
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
  ]),
  mortalityCount: z.number().int().min(0).default(0),
  causeOfMortality: z.string().trim().max(200).optional().nullable(),
  feedConsumedKg: z.number().min(0).default(0),
  eggsCollected: z.number().int().min(0).default(0),
  medicationGiven: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

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
      notes: r.notes ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

export const adminCreateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createBatchSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await checkPasscode(data.passcode);
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
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
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

    if (error) throw new Error(error.message);
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

    return (rows || []).map((r: any) => ({
      id: r.id,
      batchId: r.batch_id ?? null,
      batchName: r.farm_batches?.batch_name ?? null,
      type: r.type,
      category: r.category,
      amount: Number(r.amount || 0),
      description: r.description,
      paymentMethod: r.payment_method,
      transactionDate: r.transaction_date,
      referenceNo: r.reference_no ?? null,
      recordedBy: r.recorded_by ?? null,
      approvalStatus: r.approval_status ?? "approved",
      createdAt: r.created_at,
    }));
  });

export const adminCreateFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createFinancialSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("farm_financials")
      .insert({
        batch_id: data.batchId || null,
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        payment_method: data.paymentMethod,
        transaction_date: data.transactionDate,
        reference_no: data.referenceNo || null,
        approval_status: approvalStatus,
        recorded_by: credential.username,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id };
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
  description: z.string().trim().min(1).max(500),
  paymentMethod: z.string().trim().min(1).max(100).default("Bank Transfer"),
  transactionDate: z.string().trim().min(1),
  referenceNo: z.string().trim().max(100).optional().nullable(),
});

export const adminUpdateFinancial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateFinancialSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("farm_financials")
      .update({
        batch_id: data.batchId || null,
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        payment_method: data.paymentMethod,
        transaction_date: data.transactionDate,
        reference_no: data.referenceNo || null,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { id: data.id };
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
      notes: batchRow.notes ?? null,
      createdAt: batchRow.created_at,
      updatedAt: batchRow.updated_at,
    };

    // Fetch financials for batch
    const { data: finRows } = await supabaseAdmin
      .from("farm_financials")
      .select("*")
      .eq("batch_id", data.batchId)
      .order("transaction_date", { ascending: true });

    const financials: FarmFinancial[] = (finRows || []).map((r: any) => ({
      id: r.id,
      batchId: r.batch_id,
      type: r.type,
      category: r.category,
      amount: Number(r.amount || 0),
      description: r.description,
      paymentMethod: r.payment_method,
      transactionDate: r.transaction_date,
      referenceNo: r.reference_no ?? null,
      recordedBy: r.recorded_by ?? null,
      createdAt: r.created_at,
    }));

    // Fetch activities for batch
    const { data: actRows } = await supabaseAdmin
      .from("farm_activities")
      .select("*")
      .eq("batch_id", data.batchId)
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

    const { data: rows, error } = await supabaseAdmin
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("crm_leads query warning:", error.message);
      return [];
    }

    return (rows || []).map((r: any) => ({
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
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
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

    return (rows || []).map((r: any) => ({
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
      createdAt: r.created_at,
    }));
  });

export const adminCreateActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createActivitySchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const isOwner = role === "owner";
    const approvalStatus = isOwner ? "approved" : "pending_approval";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("farm_activities")
      .insert({
        batch_id: data.batchId || null,
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
        batchId: z.string().uuid().optional().nullable(),
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
      await checkPasscode(data.passcode);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

            // Automatically link website order to the specified farm batch if selected
            if (data.batchId) {
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

export const adminListPendingApprovals = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseAuthSchema.parse(data))
  .handler(async ({ data }): Promise<{ financials: FarmFinancial[]; activities: FarmActivity[] }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: finRows } = await supabaseAdmin
      .from("farm_financials")
      .select("*, farm_batches(batch_name)")
      .eq("approval_status", "pending_approval")
      .order("created_at", { ascending: false });

    const { data: actRows } = await supabaseAdmin
      .from("farm_activities")
      .select("*, farm_batches(batch_name)")
      .eq("approval_status", "pending_approval")
      .order("created_at", { ascending: false });

    const financials: FarmFinancial[] = (finRows || []).map((r: any) => ({
      id: r.id,
      batchId: r.batch_id ?? null,
      batchName: r.farm_batches?.batch_name ?? null,
      type: r.type,
      category: r.category,
      amount: Number(r.amount || 0),
      description: r.description,
      paymentMethod: r.payment_method,
      transactionDate: r.transaction_date,
      referenceNo: r.reference_no ?? null,
      recordedBy: r.recorded_by ?? null,
      approvalStatus: r.approval_status,
      createdAt: r.created_at,
    }));

    const activities: FarmActivity[] = (actRows || []).map((r: any) => ({
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
      approvalStatus: r.approval_status,
      createdAt: r.created_at,
    }));

    return { financials, activities };
  });

export const adminApproveStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      id: z.string().uuid(),
      targetType: z.enum(["financial", "activity"]),
    }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.targetType === "financial") {
      const { error } = await supabaseAdmin
        .from("farm_financials")
        .update({ approval_status: "approved" })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      // Get activity details for headcount adjustment if mortality recorded
      const { data: act } = await supabaseAdmin
        .from("farm_activities")
        .select("batch_id, mortality_count")
        .eq("id", data.id)
        .single();

      const { error } = await supabaseAdmin
        .from("farm_activities")
        .update({ approval_status: "approved" })
        .eq("id", data.id);
      if (error) throw new Error(error.message);

      if (act?.batch_id && Number(act.mortality_count || 0) > 0) {
        const { data: b } = await supabaseAdmin
          .from("farm_batches")
          .select("current_headcount")
          .eq("id", act.batch_id)
          .single();

        if (b) {
          const nextCount = Math.max(0, Number(b.current_headcount || 0) - Number(act.mortality_count || 0));
          await supabaseAdmin
            .from("farm_batches")
            .update({ current_headcount: nextCount, updated_at: new Date().toISOString() })
            .eq("id", act.batch_id);
        }
      }
    }

    return { ok: true };
  });

export const adminRejectStaffRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      id: z.string().uuid(),
      targetType: z.enum(["financial", "activity"]),
    }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table = data.targetType === "financial" ? "farm_financials" : "farm_activities";
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

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
    for (const item of data.activities) {
      let resolvedBatchId = data.batchId || null;
      if (!resolvedBatchId && item.batchName) {
        resolvedBatchId = batchMap.get(item.batchName.toLowerCase().trim()) || null;
      }

      insertRows.push({
        batch_id: resolvedBatchId,
        activity_date: item.activityDate || new Date().toISOString().split("T")[0],
        activity_type: item.activityType || "General Activity",
        mortality_count: Math.max(0, Number(item.mortalityCount || 0)),
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
    }

    return { importedCount: insertRows.length };
  });

