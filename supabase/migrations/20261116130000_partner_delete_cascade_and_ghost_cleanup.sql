-- Migration: 20261116130000_partner_delete_cascade_and_ghost_cleanup.sql
-- 1. Allows permanent hard-deletion of partner accounts (including retained agreements,
--    signatures, bird allocations, and allocation change history) via SECURITY DEFINER RPC
--    delete_partner_permanently(uuid), while freeing any allocated batch capacity.
-- 2. Purges soft-removed batch-synced mirror rows ("Allocation undone: <UUID>") from
--    partner_financials and partner_activities so re-allocated partners never show duplicate
--    struck-through REMOVED rows.
-- 3. Ensures public.staff_attendance exists with proper clock-in index and RLS grants.

-- 1A. Update trigger functions to permit cascading hard-deletes strictly inside delete_partner_permanently
CREATE OR REPLACE FUNCTION public.protect_allocation_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND coalesce(current_setting('daf.allow_partner_delete', true), '') = 'true' THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'DELETE'
     OR (to_jsonb(NEW) - ARRAY['undone_at','undone_by','undo_reason']) <> (to_jsonb(OLD) - ARRAY['undone_at','undone_by','undo_reason'])
     OR OLD.undone_at IS NOT NULL THEN
    RAISE EXCEPTION 'Allocation change history is immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_official_agreement()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF coalesce(current_setting('daf.allow_partner_delete', true), '') = 'true' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Agreement versions are retained permanently';
  END IF;
  IF NEW.id <> OLD.id OR NEW.partner_id <> OLD.partner_id OR NEW.snapshot <> OLD.snapshot OR NEW.content_hash <> OLD.content_hash OR NEW.template_version <> OLD.template_version OR NEW.cycle_name <> OLD.cycle_name OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Create a new agreement version to change terms';
  END IF;
  IF OLD.pdf_hash IS NOT NULL AND (NEW.pdf_hash IS DISTINCT FROM OLD.pdf_hash OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path OR NEW.completed_at IS DISTINCT FROM OLD.completed_at) THEN
    RAISE EXCEPTION 'The official signed PDF is immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('issued', 'superseded'))
    OR (OLD.status = 'issued' AND NEW.status IN ('partner_signed', 'superseded'))
    OR (OLD.status = 'partner_signed' AND NEW.status IN ('witness_signed', 'superseded'))
    OR (OLD.status = 'witness_signed' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid agreement transition';
  END IF;
  IF NEW.status IN ('issued', 'partner_signed', 'witness_signed', 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.official_agreement_signatures WHERE agreement_id = NEW.id AND signer_role = 'company' AND content_hash = NEW.content_hash) THEN
      RAISE EXCEPTION 'Company signature required';
    END IF;
    IF NEW.status IN ('partner_signed', 'witness_signed', 'completed') AND NOT EXISTS (SELECT 1 FROM public.official_agreement_signatures WHERE agreement_id = NEW.id AND signer_role = 'partner' AND content_hash = NEW.content_hash) THEN
      RAISE EXCEPTION 'Partner signature required';
    END IF;
    IF NEW.status IN ('witness_signed', 'completed') AND NOT EXISTS (SELECT 1 FROM public.official_agreement_signatures WHERE agreement_id = NEW.id AND signer_role = 'witness' AND content_hash = NEW.content_hash) THEN
      RAISE EXCEPTION 'Witness signature required';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_official_signature()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND coalesce(current_setting('daf.allow_partner_delete', true), '') = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Audit history is append-only';
END $$;

DROP TRIGGER IF EXISTS immutable_official_signature ON public.official_agreement_signatures;
CREATE TRIGGER immutable_official_signature
  BEFORE UPDATE OR DELETE ON public.official_agreement_signatures
  FOR EACH ROW EXECUTE FUNCTION public.protect_official_signature();

-- 1B. Atomic partner hard-delete RPC
CREATE OR REPLACE FUNCTION public.delete_partner_permanently(partner_input uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected_batch_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT b_id) INTO affected_batch_ids
  FROM (
    SELECT batch_id AS b_id FROM public.farm_partners WHERE id = partner_input AND batch_id IS NOT NULL
    UNION
    SELECT batch_id AS b_id FROM public.batch_bird_allocations WHERE partner_id = partner_input AND batch_id IS NOT NULL
  ) s;

  PERFORM set_config('daf.allow_partner_delete', 'true', true);
  PERFORM set_config('daf.undo_change', partner_input::text, true);

  DELETE FROM public.official_agreement_signatures
  WHERE agreement_id IN (SELECT id FROM public.official_agreements WHERE partner_id = partner_input);

  DELETE FROM public.official_agreements WHERE partner_id = partner_input;
  DELETE FROM public.partner_allocation_changes WHERE partner_id = partner_input;
  DELETE FROM public.batch_bird_allocations WHERE partner_id = partner_input;
  DELETE FROM public.partner_financials WHERE partner_id = partner_input;
  DELETE FROM public.partner_activities WHERE partner_id = partner_input;
  DELETE FROM public.farm_partners WHERE id = partner_input;

  IF affected_batch_ids IS NOT NULL AND array_length(affected_batch_ids, 1) > 0 THEN
    UPDATE public.farm_batches
    SET allocation_revision = allocation_revision + 1
    WHERE id = ANY(affected_batch_ids);
  END IF;

  PERFORM set_config('daf.allow_partner_delete', '', true);
  PERFORM set_config('daf.undo_change', '', true);
END $$;

REVOKE ALL ON FUNCTION
  public.protect_allocation_change(),
  public.protect_official_agreement(),
  public.protect_official_signature(),
  public.delete_partner_permanently(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.protect_allocation_change(),
  public.protect_official_agreement(),
  public.protect_official_signature(),
  public.delete_partner_permanently(uuid)
TO service_role;

-- 2. Purge existing soft-removed batch-synced mirror rows ("Allocation undone" duplicates)
DELETE FROM public.partner_financials
WHERE removed_at IS NOT NULL
  AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL);

DELETE FROM public.partner_activities
WHERE removed_at IS NOT NULL
  AND source_activity_id IS NOT NULL;

-- Update reconcile_partner_batch & reconcile_partner_commerce so future reconciliations also
-- prune soft-removed synced mirror copies instead of keeping stale duplicates alongside active rows.
CREATE OR REPLACE FUNCTION public.reconcile_partner_batch(partner_id_input uuid, allocation_input numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE partner public.farm_partners; ratio numeric; cutoff date; BEGIN
  SELECT * INTO partner FROM public.farm_partners WHERE id = partner_id_input FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
  IF partner.batch_id IS NULL OR partner.cycle_status = 'closed' THEN RETURN; END IF;
  ratio := CASE WHEN partner.allocated_birds IS NOT NULL THEN partner.allocated_birds::numeric / (SELECT initial_headcount FROM public.farm_batches WHERE id = partner.batch_id) ELSE coalesce(partner.batch_allocation_percentage, 100) / 100 END;
  IF ratio < 0 OR ratio > 1 THEN RAISE EXCEPTION 'Invalid allocation'; END IF;
  SELECT least(start_date, partner.cycle_start_date) INTO cutoff FROM public.farm_batches WHERE id = partner.batch_id;

  DELETE FROM public.partner_financials pf
  WHERE pf.partner_id = partner.id AND pf.source_financial_id IS NOT NULL AND pf.removed_at IS NOT NULL;

  DELETE FROM public.partner_activities pa
  WHERE pa.partner_id = partner.id AND pa.source_activity_id IS NOT NULL AND pa.removed_at IS NOT NULL;

  UPDATE public.partner_financials pf SET removed_at = now(), removal_reason = 'Source changed, deleted or unapproved'
  WHERE pf.partner_id = partner.id AND pf.source_financial_id IS NOT NULL AND pf.removed_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.farm_financials f
      WHERE f.id = pf.source_financial_id AND f.batch_id = partner.batch_id
        AND coalesce(f.approval_status, 'approved') = 'approved'
        AND (cutoff IS NULL OR f.transaction_date >= cutoff)
    );

  INSERT INTO public.partner_financials(partner_id, batch_id, source_financial_id, type, category, amount, description, payment_method,
    transaction_date, reference_no, recorded_by, approval_status, approved_by, approved_at, cycle_name)
  SELECT partner.id, f.batch_id, f.id, f.type, f.category,
    round((CASE WHEN f.type = 'income' THEN coalesce(f.amount_paid, f.amount) ELSE f.amount END) * ratio, 2),
    f.description, f.payment_method, f.transaction_date, 'BATCH-SYNC-' || f.id::text, f.recorded_by, 'approved', 'system', now(), partner.cycle_name
  FROM public.farm_financials f
  WHERE f.batch_id = partner.batch_id
    AND coalesce(f.approval_status, 'approved') = 'approved'
    AND (cutoff IS NULL OR f.transaction_date >= cutoff)
  ON CONFLICT (partner_id, source_financial_id) WHERE source_financial_id IS NOT NULL AND removed_at IS NULL
  DO UPDATE SET amount = excluded.amount, description = excluded.description, type = excluded.type, category = excluded.category,
    transaction_date = excluded.transaction_date, payment_method = excluded.payment_method, approval_status = 'approved'
  WHERE (partner_financials.amount, partner_financials.description, partner_financials.type, partner_financials.category, partner_financials.transaction_date, partner_financials.payment_method, partner_financials.approval_status)
    IS DISTINCT FROM (excluded.amount, excluded.description, excluded.type, excluded.category, excluded.transaction_date, excluded.payment_method, excluded.approval_status);

  UPDATE public.partner_activities pa SET removed_at = now(), removal_reason = 'Source changed, deleted or unapproved'
  WHERE pa.partner_id = partner.id AND pa.source_activity_id IS NOT NULL AND pa.removed_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.farm_activities a
      WHERE a.id = pa.source_activity_id AND a.batch_id = partner.batch_id
        AND coalesce(a.approval_status, 'approved') = 'approved'
        AND (cutoff IS NULL OR a.activity_date >= cutoff)
    );

  INSERT INTO public.partner_activities(partner_id, batch_id, source_activity_id, activity_date, activity_type, stock_headcount, mortality_count,
    cause_of_mortality, feed_consumed_kg, average_weight_kg, notes, recorded_by, approval_status, approved_by, approved_at, cycle_name)
  SELECT partner.id, a.batch_id, a.id, a.activity_date,
    CASE WHEN a.activity_type IN ('Feeding', 'Mortality Record', 'Weight Check', 'Medication / Vaccination', 'Cleaning & Sanitation')
      THEN a.activity_type ELSE 'General Note' END,
    0, round(a.mortality_count * ratio)::integer, a.cause_of_mortality,
    round(a.feed_consumed_kg * ratio, 1), 0, coalesce(a.notes, a.activity_type) || ' [SYNC:' || a.id::text || ']', a.recorded_by, 'approved', 'system', now(), partner.cycle_name
  FROM public.farm_activities a
  WHERE a.batch_id = partner.batch_id
    AND coalesce(a.approval_status, 'approved') = 'approved'
    AND (cutoff IS NULL OR a.activity_date >= cutoff)
  ON CONFLICT (partner_id, source_activity_id) WHERE source_activity_id IS NOT NULL AND removed_at IS NULL
  DO UPDATE SET activity_date = excluded.activity_date, activity_type = excluded.activity_type, mortality_count = excluded.mortality_count,
    feed_consumed_kg = excluded.feed_consumed_kg, cause_of_mortality = excluded.cause_of_mortality, notes = excluded.notes, approval_status = 'approved'
  WHERE (partner_activities.activity_date, partner_activities.activity_type, partner_activities.mortality_count, partner_activities.feed_consumed_kg, partner_activities.cause_of_mortality, partner_activities.notes, partner_activities.approval_status)
    IS DISTINCT FROM (excluded.activity_date, excluded.activity_type, excluded.mortality_count, excluded.feed_consumed_kg, excluded.cause_of_mortality, excluded.notes, excluded.approval_status);
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_partner_commerce(partner_id_input uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.farm_partners; ratio numeric; BEGIN
  SELECT * INTO p FROM public.farm_partners WHERE id = partner_id_input FOR UPDATE;
  IF NOT FOUND OR p.batch_id IS NULL OR p.cycle_status = 'closed' THEN RETURN; END IF;
  ratio := CASE WHEN p.allocated_birds IS NOT NULL THEN p.allocated_birds::numeric / (SELECT initial_headcount FROM public.farm_batches WHERE id = p.batch_id) ELSE p.batch_allocation_percentage / 100 END;

  DELETE FROM public.partner_financials pf
  WHERE pf.partner_id = p.id
    AND (pf.source_order_id IS NOT NULL OR pf.source_preorder_id IS NOT NULL)
    AND pf.removed_at IS NOT NULL;

  UPDATE public.partner_financials pf SET removed_at = now(), removal_reason = 'Order cancelled, reassigned or unapproved'
  WHERE pf.partner_id = p.id AND pf.source_order_id IS NOT NULL AND pf.removed_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = pf.source_order_id AND o.batch_id = p.batch_id AND o.payment_status = 'approved' AND o.status <> 'cancelled');

  UPDATE public.partner_financials pf SET removed_at = now(), removal_reason = 'Preorder reassigned or payment reversed'
  WHERE pf.partner_id = p.id AND pf.source_preorder_id IS NOT NULL AND pf.removed_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.preorders o WHERE o.id = pf.source_preorder_id AND o.batch_id = p.batch_id AND o.amount_paid > 0);

  INSERT INTO public.partner_financials(partner_id, batch_id, source_order_id, type, category, amount, description, payment_method, transaction_date, reference_no, approval_status, cycle_name)
  SELECT p.id, o.batch_id, o.id, 'income', 'Store Order', round(o.total * ratio, 2), 'Storefront receipt ' || o.order_code, 'Bank Transfer', coalesce(o.payment_approved_at, o.created_at)::date, 'ORDER-SYNC-' || o.id::text, 'approved', p.cycle_name
  FROM public.orders o
  WHERE o.batch_id = p.batch_id AND o.payment_status = 'approved' AND o.status <> 'cancelled'
  ON CONFLICT (partner_id, source_order_id) WHERE source_order_id IS NOT NULL AND removed_at IS NULL
  DO UPDATE SET amount = excluded.amount, transaction_date = excluded.transaction_date
  WHERE (partner_financials.amount, partner_financials.transaction_date) IS DISTINCT FROM (excluded.amount, excluded.transaction_date);

  INSERT INTO public.partner_financials(partner_id, batch_id, source_preorder_id, type, category, amount, description, payment_method, transaction_date, reference_no, approval_status, cycle_name)
  SELECT p.id, o.batch_id, o.id, 'income', 'December Pre-Order', round(o.amount_paid * ratio, 2), 'Preorder receipts ' || o.preorder_code, 'Bank Transfer', o.created_at::date, 'PREORDER-SYNC-' || o.id::text, 'approved', p.cycle_name
  FROM public.preorders o
  WHERE o.batch_id = p.batch_id AND o.amount_paid > 0
  ON CONFLICT (partner_id, source_preorder_id) WHERE source_preorder_id IS NOT NULL AND removed_at IS NULL
  DO UPDATE SET amount = excluded.amount WHERE partner_financials.amount IS DISTINCT FROM excluded.amount;
END $$;

REVOKE ALL ON FUNCTION public.reconcile_partner_batch(uuid, numeric), public.reconcile_partner_commerce(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_partner_batch(uuid, numeric), public.reconcile_partner_commerce(uuid) TO service_role;

-- 3. Ensure staff_attendance table and clock-in index exist
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'on_leave')),
  clock_in_time timestamptz NOT NULL DEFAULT now(),
  clock_out_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(username, attendance_date)
);

ALTER TABLE public.staff_attendance
  ALTER COLUMN clock_in_time SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_time
  ON public.staff_attendance (attendance_date DESC, clock_in_time DESC);

GRANT ALL ON public.staff_attendance TO service_role;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_attendance' AND policyname = 'Server access to staff attendance'
  ) THEN
    CREATE POLICY "Server access to staff attendance"
      ON public.staff_attendance FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

