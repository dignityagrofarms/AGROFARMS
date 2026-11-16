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

    // Self-healing fallback when a partner was linked during Registration (before 20261116110000 migration)
    if (
      preview &&
      !preview.canUndo &&
      preview.current?.batch_id &&
      (!preview.changeId ||
        /Previous allocation details were not recorded|Reload the partner workspace/i.test(
          preview.reason || "",
        ))
    ) {
      const [{ data: pRow }, { data: payouts }, { data: sigs }] = await Promise.all([
        supabaseAdmin
          .from("farm_partners")
          .select("id, active, cycle_status, cycle_name, settled_at, settlement_snapshot, agreement_signed")
          .eq("id", data.partnerId)
          .maybeSingle(),
        supabaseAdmin
          .from("partner_financials")
          .select("id")
          .eq("partner_id", data.partnerId)
          .eq("type", "payout")
          .limit(1),
        (supabaseAdmin as any)
          .from("official_agreements")
          .select("id, official_agreement_signatures(id)")
          .eq("partner_id", data.partnerId),
      ]);

      const hasSignedOfficial = (sigs || []).some(
        (a: any) =>
          Array.isArray(a.official_agreement_signatures) &&
          a.official_agreement_signatures.length > 0,
      );

      if (
        pRow &&
        pRow.active !== false &&
        pRow.cycle_status === "open" &&
        !pRow.settled_at &&
        !pRow.settlement_snapshot &&
        !pRow.agreement_signed &&
        !hasSignedOfficial &&
        !(payouts && payouts.length > 0)
      ) {
        return {
          ...preview,
          canUndo: true,
          reason: null,
          changeId: preview.changeId || data.partnerId,
          previousBatchRevision: null,
          previous: preview.previous || {
            batch_id: null,
            batch_name: null,
            allocated_birds: null,
            initial_investment: preview.current.initial_investment,
            batch_allocation_percentage: 0,
            profit_share_percentage: preview.current.profit_share_percentage,
            loss_share_percentage: preview.current.loss_share_percentage,
            auto_sync_batch: false,
          },
        };
      }
    }

    return preview;
  });
export const undoPartnerAllocation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        passcode: z.string(),
        partnerId: z.string().uuid(),
        changeId: z.string().uuid().nullable(),
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
    const effectiveChangeId = data.changeId || data.partnerId;
    const { error } = await (supabaseAdmin as any).rpc("undo_partner_allocation", {
      partner_input: data.partnerId,
      change_input: effectiveChangeId,
      version_input: data.allocationVersion,
      batch_revision_input: data.batchRevision,
      previous_revision_input: data.previousBatchRevision,
      reason_input: data.reason,
    });
    if (error) {
      if (
        /Allocation change unavailable|Previous allocation details were not recorded|Reload the partner workspace/i.test(
          error.message || "",
        )
      ) {
        const { data: pRow } = await supabaseAdmin
          .from("farm_partners")
          .select("*")
          .eq("id", data.partnerId)
          .single();
        if (!pRow || !pRow.batch_id) throw new Error(error.message);
        if (pRow.cycle_status === "closed" || pRow.settled_at || pRow.agreement_signed) {
          throw new Error("Closed, settled, or signed cycles cannot be undone.");
        }
        const now = new Date().toISOString();
        const prevBatchId = pRow.batch_id;
        await Promise.all([
          supabaseAdmin
            .from("partner_financials")
            .update({ removed_at: now, removal_reason: `Allocation undone: ${data.reason}` })
            .eq("partner_id", data.partnerId)
            .is("removed_at", null)
            .or("source_financial_id.not.is.null,source_order_id.not.is.null,source_preorder_id.not.is.null"),
          supabaseAdmin
            .from("partner_activities")
            .update({ removed_at: now, removal_reason: `Allocation undone: ${data.reason}` })
            .eq("partner_id", data.partnerId)
            .is("removed_at", null)
            .not("source_activity_id", "is", null),
          (supabaseAdmin as any)
            .from("batch_bird_allocations")
            .update({ closed_at: now, voided_at: now, void_reason: data.reason })
            .eq("partner_id", data.partnerId)
            .is("closed_at", null)
            .is("voided_at", null),
        ]);
        const { error: uErr } = await supabaseAdmin
          .from("farm_partners")
          .update({
            batch_id: null,
            allocated_birds: null,
            batch_allocation_percentage: 0,
            auto_sync_batch: false,
            updated_at: now,
          })
          .eq("id", data.partnerId);
        if (uErr) throw new Error(uErr.message);

        const { data: bRow } = await supabaseAdmin
          .from("farm_batches")
          .select("allocation_revision")
          .eq("id", prevBatchId)
          .maybeSingle();
        if (bRow) {
          await supabaseAdmin
            .from("farm_batches")
            .update({ allocation_revision: Number((bRow as any).allocation_revision || 0) + 1 })
            .eq("id", prevBatchId);
        }
        await (supabaseAdmin as any)
          .from("official_agreements")
          .update({ status: "superseded" })
          .eq("partner_id", data.partnerId)
          .eq("cycle_name", pRow.cycle_name)
          .eq("status", "draft");
        return { ok: true };
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
