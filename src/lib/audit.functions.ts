/* eslint-disable @typescript-eslint/no-explicit-any -- The audit table is newer than generated database types. */
import type { Json } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkPasscode, parseAdminCredential } from "./orders.functions";
export const listRecordHistory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        passcode: z.string(),
        page: z.number().int().min(0).default(0),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        status: z
          .enum(["all", "approved", "rejected", "pending_approval", "flagged", "removed"])
          .default("all"),
        submitter: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await (supabaseAdmin as any).rpc("submission_history_summary", {
      username_input:
        role === "owner" ? data.submitter?.trim().toLowerCase() || null : credential.username,
      status_input: data.status,
      from_input: data.from || null,
      to_input: data.to || null,
      page_input: data.page,
    });
    if (error) throw new Error(`History unavailable: ${error.message}`);
    return result as { rows: HistoryEvent[]; total: number };
  });

export type HistoryEvent = {
  id: number;
  source_id: string;
  source_table: string;
  action: string;
  actor_name: string | null;
  actor_role: string | null;
  recorded_by: string | null;
  revision: number;
  created_at: string;
  current_status?: string;
  before_data: { [key: string]: Json | undefined } | null;
  after_data: { [key: string]: Json | undefined } | null;
};
export const getSubmissionChanges = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        passcode: z.string(),
        sourceId: z.string().uuid(),
        sourceTable: z.enum([
          "farm_financials",
          "farm_activities",
          "contact_transactions",
          "farm_financial_payments",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("record_audit_events")
      .select("*")
      .eq("source_id", data.sourceId)
      .eq("source_table", data.sourceTable)
      .order("id", { ascending: false });
    if (role !== "owner") query = query.eq("recorded_by", credential.username);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load saved changes.");
    return rows as HistoryEvent[];
  });
