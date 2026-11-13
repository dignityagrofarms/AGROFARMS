-- Phase 1: Batch Lifecycle (Close/Reopen) + Approval Queue Reasons & Special Contact Approvals

ALTER TABLE farm_batches
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by text;

ALTER TABLE farm_financials
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE farm_activities
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_farm_financials_approval_status
  ON farm_financials(approval_status);

CREATE INDEX IF NOT EXISTS idx_farm_activities_approval_status
  ON farm_activities(approval_status);

DO $$
BEGIN
  IF to_regclass('public.contact_transactions') IS NOT NULL THEN
    ALTER TABLE public.contact_transactions
      ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
        CHECK (approval_status IN ('approved', 'pending_approval', 'rejected')),
      ADD COLUMN IF NOT EXISTS rejection_reason text;

    CREATE INDEX IF NOT EXISTS idx_contact_transactions_approval_status
      ON public.contact_transactions(approval_status);
  END IF;
END $$;
