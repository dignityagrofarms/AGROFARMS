import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner, parseAdminCredential } from "./orders.functions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FarmPartner {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  username: string;
  initialInvestment: number;
  investmentDate: string;
  targetRoiPercentage: number;
  agreedTerms: string | null;
  projectName: string;
  batchId: string | null;
  batchName?: string | null;
  status: "active" | "matured" | "completed" | "paused";
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalExpenses: number;
  totalIncome: number;
  netProfit: number;
  currentRoiPercentage: number;
}

export interface PartnerFinancial {
  id: string;
  partnerId: string;
  batchId: string | null;
  type: "expense" | "income";
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNo: string | null;
  recordedBy: string | null;
  createdAt: string;
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
}

export interface PartnerDashboardData {
  partner: FarmPartner;
  financials: PartnerFinancial[];
  activities: PartnerActivity[];
  summary: {
    totalInvested: number;
    totalExpenses: number;
    totalIncome: number;
    netBalance: number;
    roiPercentage: number;
    currentStockCount: number;
    totalFeedConsumedKg: number;
    totalMortalityCount: number;
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function hashPasscode(passcode: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passcode));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
      .select("partner_id, type, amount");

    if (fErr) throw new Error(fErr.message);

    // Compute financial sums per partner
    const finMap = new Map<string, { expenses: number; income: number }>();
    for (const f of financials || []) {
      const entry = finMap.get(f.partner_id) || { expenses: 0, income: 0 };
      const amt = Number(f.amount) || 0;
      if (f.type === "expense") entry.expenses += amt;
      else if (f.type === "income") entry.income += amt;
      finMap.set(f.partner_id, entry);
    }

    return (partners || []).map((p: any) => {
      const f = finMap.get(p.id) || { expenses: 0, income: 0 };
      const initial = Number(p.initial_investment) || 0;
      const net = f.income - f.expenses;
      const roi = initial > 0 ? (net / initial) * 100 : 0;

      return {
        id: p.id,
        fullName: p.full_name,
        phone: p.phone,
        email: p.email,
        address: p.address,
        username: p.username,
        initialInvestment: initial,
        investmentDate: p.investment_date,
        targetRoiPercentage: Number(p.target_roi_percentage) || 0,
        agreedTerms: p.agreed_terms,
        projectName: p.project_name || "Broiler Cycle Partnership",
        batchId: p.batch_id,
        batchName: p.farm_batches?.batch_name ?? null,
        status: p.status,
        active: Boolean(p.active),
        lastLoginAt: p.last_login_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        totalExpenses: f.expenses,
        totalIncome: f.income,
        netProfit: net,
        currentRoiPercentage: Math.round(roi * 10) / 10,
      };
    });
  });

export const adminGetPartnerDetail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
      }).parse(data),
  )
  .handler(async ({ data }): Promise<{ partner: FarmPartner; financials: PartnerFinancial[]; activities: PartnerActivity[] }> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: p, error: pErr } = await supabaseAdmin
      .from("farm_partners")
      .select("*, farm_batches(batch_name)")
      .eq("id", data.partnerId)
      .single();

    if (pErr || !p) throw new Error("Partner record not found.");

    const { data: finRows, error: fErr } = await supabaseAdmin
      .from("partner_financials")
      .select("*")
      .eq("partner_id", data.partnerId)
      .order("transaction_date", { ascending: false });

    if (fErr) throw new Error(fErr.message);

    const { data: actRows, error: aErr } = await supabaseAdmin
      .from("partner_activities")
      .select("*")
      .eq("partner_id", data.partnerId)
      .order("activity_date", { ascending: false });

    if (aErr) throw new Error(aErr.message);

    let totalExpenses = 0;
    let totalIncome = 0;
    const financials: PartnerFinancial[] = (finRows || []).map((r: any) => {
      const amt = Number(r.amount) || 0;
      if (r.type === "expense") totalExpenses += amt;
      else if (r.type === "income") totalIncome += amt;
      return {
        id: r.id,
        partnerId: r.partner_id,
        batchId: r.batch_id,
        type: r.type,
        category: r.category,
        amount: amt,
        description: r.description,
        paymentMethod: r.payment_method || "Bank Transfer",
        transactionDate: r.transaction_date,
        referenceNo: r.reference_no,
        recordedBy: r.recorded_by,
        createdAt: r.created_at,
      };
    });

    const activities: PartnerActivity[] = (actRows || []).map((r: any) => ({
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
    }));

    const initial = Number(p.initial_investment) || 0;
    const net = totalIncome - totalExpenses;
    const roi = initial > 0 ? (net / initial) * 100 : 0;

    const partner: FarmPartner = {
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
      email: p.email,
      address: p.address,
      username: p.username,
      initialInvestment: initial,
      investmentDate: p.investment_date,
      targetRoiPercentage: Number(p.target_roi_percentage) || 0,
      agreedTerms: p.agreed_terms,
      projectName: p.project_name || "Broiler Cycle Partnership",
      batchId: p.batch_id,
      batchName: p.farm_batches?.batch_name ?? null,
      status: p.status,
      active: Boolean(p.active),
      lastLoginAt: p.last_login_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      totalExpenses,
      totalIncome,
      netProfit: net,
      currentRoiPercentage: Math.round(roi * 10) / 10,
    };

    return { partner, financials, activities };
  });

export const adminCreatePartner = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
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
        investmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        targetRoiPercentage: z.number().min(0).max(500).default(0),
        agreedTerms: z.string().trim().optional().nullable(),
        projectName: z.string().trim().min(2).default("Broiler Cycle Partnership"),
        batchId: z.string().uuid().optional().nullable(),
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check reserved usernames
    const reserved = ["owner", "admin", "staff", "manager", "everyone", "system"];
    if (reserved.includes(data.username)) {
      throw new Error(`The username '${data.username}' is reserved. Please pick another username.`);
    }

    // Check existing in farm_partners
    const { data: existingP } = await supabaseAdmin
      .from("farm_partners")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();

    if (existingP) {
      throw new Error(`A partner with username '${data.username}' already exists.`);
    }

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
        target_roi_percentage: data.targetRoiPercentage,
        agreed_terms: data.agreedTerms || null,
        project_name: data.projectName,
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
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        fullName: z.string().trim().min(2),
        phone: z.string().trim().min(7),
        email: z.string().trim().email().optional().nullable(),
        address: z.string().trim().optional().nullable(),
        initialInvestment: z.number().min(0),
        investmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        targetRoiPercentage: z.number().min(0).max(500),
        agreedTerms: z.string().trim().optional().nullable(),
        projectName: z.string().trim().min(2),
        batchId: z.string().uuid().optional().nullable(),
        status: z.enum(["active", "matured", "completed", "paused"]),
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("farm_partners")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        initial_investment: data.initialInvestment,
        investment_date: data.investmentDate,
        target_roi_percentage: data.targetRoiPercentage,
        agreed_terms: data.agreedTerms || null,
        project_name: data.projectName,
        batch_id: data.batchId || null,
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.partnerId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetPartnerPasscode = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        newPassword: z.string().trim().min(6, "Password must be at least 6 characters"),
      }).parse(data),
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
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        active: z.boolean(),
      }).parse(data),
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
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("farm_partners").delete().eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRecordPartnerFinancial = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        batchId: z.string().uuid().optional().nullable(),
        type: z.enum(["expense", "income"]),
        category: z.string().trim().min(2),
        amount: z.number().min(0.01, "Amount must be greater than zero"),
        description: z.string().trim().min(2),
        paymentMethod: z.string().default("Bank Transfer"),
        transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        referenceNo: z.string().trim().optional().nullable(),
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

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

export const adminDeletePartnerFinancial = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        financialId: z.string().uuid(),
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("partner_financials").delete().eq("id", data.financialId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRecordPartnerActivity = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        partnerId: z.string().uuid(),
        batchId: z.string().uuid().optional().nullable(),
        activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = parseAdminCredential(data.passcode);

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
  .inputValidator(
    (data: unknown) =>
      z.object({
        passcode: z.string().min(1),
        activityId: z.string().uuid(),
      }).parse(data),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("partner_activities").delete().eq("id", data.activityId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Partner Portal Server Functions (Strict Multi-Tenant Isolation) ──────────

export const partnerVerifyLogin = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        username: z.string().trim().toLowerCase().min(1),
        passcode: z.string().trim().min(1),
      }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; partnerId: string; fullName: string; username: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: partner, error } = await supabaseAdmin
      .from("farm_partners")
      .select("id, full_name, username, passcode_hash, active")
      .eq("username", data.username)
      .maybeSingle();

    if (error || !partner) {
      throw new Error("Invalid partner username or passcode.");
    }

    if (!partner.active) {
      throw new Error("This partner account is inactive. Please contact Dignity Agro Farms administration.");
    }

    const targetHash = await hashPasscode(data.passcode);
    if (partner.passcode_hash !== targetHash) {
      throw new Error("Invalid partner username or passcode.");
    }

    void supabaseAdmin
      .from("farm_partners")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", partner.id);

    return {
      ok: true,
      partnerId: partner.id,
      fullName: partner.full_name,
      username: partner.username,
    };
  });

export const partnerGetMyDashboard = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        username: z.string().trim().toLowerCase().min(1),
        passcode: z.string().trim().min(1),
      }).parse(data),
  )
  .handler(async ({ data }): Promise<PartnerDashboardData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Authenticate partner
    const { data: p, error: pErr } = await supabaseAdmin
      .from("farm_partners")
      .select("*, farm_batches(batch_name)")
      .eq("username", data.username)
      .maybeSingle();

    if (pErr || !p) throw new Error("Invalid partner authentication.");
    if (!p.active) throw new Error("Your partner account is inactive. Contact Dignity Agro Farms administration.");

    const targetHash = await hashPasscode(data.passcode);
    if (p.passcode_hash !== targetHash) throw new Error("Invalid partner authentication.");

    // Fetch this partner's financials only
    const { data: finRows, error: fErr } = await supabaseAdmin
      .from("partner_financials")
      .select("*")
      .eq("partner_id", p.id)
      .order("transaction_date", { ascending: false });

    if (fErr) throw new Error(fErr.message);

    // Fetch this partner's activities only
    const { data: actRows, error: aErr } = await supabaseAdmin
      .from("partner_activities")
      .select("*")
      .eq("partner_id", p.id)
      .order("activity_date", { ascending: false });

    if (aErr) throw new Error(aErr.message);

    let totalExpenses = 0;
    let totalIncome = 0;
    const financials: PartnerFinancial[] = (finRows || []).map((r: any) => {
      const amt = Number(r.amount) || 0;
      if (r.type === "expense") totalExpenses += amt;
      else if (r.type === "income") totalIncome += amt;
      return {
        id: r.id,
        partnerId: r.partner_id,
        batchId: r.batch_id,
        type: r.type,
        category: r.category,
        amount: amt,
        description: r.description,
        paymentMethod: r.payment_method || "Bank Transfer",
        transactionDate: r.transaction_date,
        referenceNo: r.reference_no,
        recordedBy: r.recorded_by,
        createdAt: r.created_at,
      };
    });

    let currentStockCount = 0;
    let totalFeedConsumedKg = 0;
    let totalMortalityCount = 0;

    const activities: PartnerActivity[] = (actRows || []).map((r: any) => {
      const sHead = Number(r.stock_headcount) || 0;
      const mort = Number(r.mortality_count) || 0;
      const feed = Number(r.feed_consumed_kg) || 0;
      if (sHead > 0) currentStockCount += sHead;
      totalMortalityCount += mort;
      totalFeedConsumedKg += feed;

      return {
        id: r.id,
        partnerId: r.partner_id,
        batchId: r.batch_id,
        activityDate: r.activity_date,
        activityType: r.activity_type,
        stockHeadcount: sHead,
        mortalityCount: mort,
        causeOfMortality: r.cause_of_mortality,
        feedConsumedKg: feed,
        averageWeightKg: Number(r.average_weight_kg) || 0,
        notes: r.notes,
        recordedBy: r.recorded_by,
        createdAt: r.created_at,
      };
    });

    // Net live stock after mortality
    const netStock = Math.max(0, currentStockCount - totalMortalityCount);
    const initial = Number(p.initial_investment) || 0;
    const netProfit = totalIncome - totalExpenses;
    const roi = initial > 0 ? (netProfit / initial) * 100 : 0;

    const partner: FarmPartner = {
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
      email: p.email,
      address: p.address,
      username: p.username,
      initialInvestment: initial,
      investmentDate: p.investment_date,
      targetRoiPercentage: Number(p.target_roi_percentage) || 0,
      agreedTerms: p.agreed_terms,
      projectName: p.project_name || "Broiler Cycle Partnership",
      batchId: p.batch_id,
      batchName: p.farm_batches?.batch_name ?? null,
      status: p.status,
      active: Boolean(p.active),
      lastLoginAt: p.last_login_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      totalExpenses,
      totalIncome,
      netProfit,
      currentRoiPercentage: Math.round(roi * 10) / 10,
    };

    return {
      partner,
      financials,
      activities,
      summary: {
        totalInvested: initial,
        totalExpenses,
        totalIncome,
        netBalance: netProfit,
        roiPercentage: Math.round(roi * 10) / 10,
        currentStockCount: netStock,
        totalFeedConsumedKg: Math.round(totalFeedConsumedKg * 10) / 10,
        totalMortalityCount,
      },
    };
  });
