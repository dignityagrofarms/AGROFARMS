/* eslint-disable @typescript-eslint/no-explicit-any -- New undo RPCs are newer than generated types. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner } from "./orders.functions";
export type UndoFields = {
  batch_id: string | null;
  batch_name: string | null;
  allocated_birds: number | null;
  initial_investment: number;
  batch_allocation_percentage: number;
  profit_share_percentage: number;
  loss_share_percentage: number;
  auto_sync_batch: boolean;
};
export type AllocationUndoPreview = {
  canUndo: boolean;
  reason: string | null;
  changeId: string | null;
  partnerId: string;
  partnerName: string;
  cycleName: string;
  allocationVersion: number;
  batchRevision: number | null;
  previousBatchRevision: number | null;
  current: UndoFields;
  previous: UndoFields | null;
  linkedFinancialCount: number;
  linkedActivityCount: number;
};
export const previewPartnerAllocationUndo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ passcode: z.string(), partnerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<AllocationUndoPreview> => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: preview, error } = await (supabaseAdmin as any).rpc("partner_undo_preview", {
      partner_input: data.partnerId,
    });
    if (error) throw new Error("Could not load the previous allocation. Please retry.");
    return preview;
  });
export const undoPartnerAllocation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        passcode: z.string(),
        partnerId: z.string().uuid(),
        changeId: z.string().uuid(),
        allocationVersion: z.number().int().min(0),
        batchRevision: z.number().int().nullable(),
        previousBatchRevision: z.number().int().nullable(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("undo_partner_allocation", {
      partner_input: data.partnerId,
      change_input: data.changeId,
      version_input: data.allocationVersion,
      batch_revision_input: data.batchRevision,
      previous_revision_input: data.previousBatchRevision,
      reason_input: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
