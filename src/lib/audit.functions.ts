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
          .enum(["all", "approved", "rejected", "pending_approval", "flagged"])
          .default("all"),
        submitter: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const role = await checkPasscode(data.passcode);
    const credential = parseAdminCredential(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("record_audit_events")
      .select("*", { count: "exact" })
      .in("source_table", [
        "farm_financials",
        "farm_activities",
        "contact_transactions",
        "farm_financial_payments",
      ])
      .order("id", { ascending: false });
    if (role !== "owner") query = query.eq("recorded_by", credential.username);
    else if (data.submitter) query = query.eq("recorded_by", data.submitter.trim().toLowerCase());
    if (data.from) query = query.gte("created_at", `${data.from}T00:00:00+01:00`);
    if (data.to)
      query = query.lt(
        "created_at",
        new Date(new Date(`${data.to}T00:00:00+01:00`).getTime() + 86400000).toISOString(),
      );
    if (data.status === "pending_approval")
      query = query.in("after_data->>approval_status", ["pending", "pending_approval"]);
    else if (data.status !== "all") query = query.eq("after_data->>approval_status", data.status);
    const { data: rows, error, count } = await query.range(data.page * 50, data.page * 50 + 49);
    if (error) throw new Error(`History unavailable: ${error.message}`);
    return {
      rows: rows as Array<{
        id: number;
        source_id: string;
        source_table: string;
        action: string;
        actor_name: string | null;
        actor_role: string | null;
        recorded_by: string | null;
        revision: number;
        created_at: string;
        before_data: { [key: string]: Json | undefined } | null;
        after_data: { [key: string]: Json | undefined } | null;
      }>,
      total: count as number,
    };
  });
