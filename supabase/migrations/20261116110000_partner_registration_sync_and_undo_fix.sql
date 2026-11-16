-- Migration: 20261116110000_partner_registration_sync_and_undo_fix.sql
-- 1. Captures initial batch allocations made during Partner Registration (INSERT on farm_partners)
--    so "Undo batch allocation" always has a valid baseline snapshot to revert to.
-- 2. Repairs existing registration-linked partners that were saved with batch_allocation_percentage = 0
--    and auto_sync_batch = false, and synchronizes their linked batch financials and flock logs.
-- 3. Updates partner_undo_preview, undo_partner_allocation, and allocate_batch_investors so
--    registration-linked or direct-linked partners can always be cleanly undone/detached and
--    historical/completed batches can be allocated or reconciled when needed.

CREATE OR REPLACE FUNCTION public.capture_allocation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  event_id bigint;
  prior_fields jsonb;
BEGIN
  IF coalesce(current_setting('daf.undo_change', true), '') <> '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.batch_id IS NULL THEN
      RETURN NEW;
    END IF;
    prior_fields := jsonb_build_object(
      'batch_id', NULL,
      'allocated_birds', NULL,
      'initial_investment', NEW.initial_investment,
      'batch_allocation_percentage', 0,
      'profit_share_percentage', NEW.profit_share_percentage,
      'loss_share_percentage', NEW.loss_share_percentage,
      'auto_sync_batch', false
    );
  ELSE
    IF OLD.cycle_name <> NEW.cycle_name
       OR allocation_fields(to_jsonb(OLD)) = allocation_fields(to_jsonb(NEW))
       OR (OLD.batch_id IS NULL AND NEW.batch_id IS NULL) THEN
      RETURN NEW;
    END IF;
    prior_fields := allocation_fields(to_jsonb(OLD));
  END IF;

  SELECT max(id) INTO event_id
  FROM public.record_audit_events
  WHERE source_table = 'farm_partners' AND source_id = NEW.id;

  IF event_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.partner_allocation_changes(
    partner_id,
    source_event_id,
    cycle_name,
    before_fields,
    after_fields,
    before_financials,
    before_activities
  )
  VALUES (
    NEW.id,
    event_id,
    NEW.cycle_name,
    prior_fields,
    allocation_fields(to_jsonb(NEW)),
    CASE
      WHEN TG_OP = 'INSERT' THEN '[]'::jsonb
      ELSE (
        SELECT coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM public.partner_financials f
        WHERE partner_id = NEW.id
          AND removed_at IS NULL
          AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL)
      )
    END,
    CASE
      WHEN TG_OP = 'INSERT' THEN '[]'::jsonb
      ELSE (
        SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
        FROM public.partner_activities a
        WHERE partner_id = NEW.id
          AND removed_at IS NULL
          AND source_activity_id IS NOT NULL
      )
    END
  )
  ON CONFLICT (source_event_id) DO UPDATE
    SET after_fields = excluded.after_fields;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zz_capture_allocation_change ON public.farm_partners;
CREATE TRIGGER zz_capture_allocation_change
  AFTER INSERT OR UPDATE ON public.farm_partners
  FOR EACH ROW EXECUTE FUNCTION public.capture_allocation_change();

-- Repair existing open-cycle partners that were linked to a batch during registration
-- with batch_allocation_percentage = 0 and auto_sync_batch = false.
DO $$
DECLARE
  p record;
  b public.farm_batches;
  calc_birds integer;
  reserved_birds integer;
BEGIN
  FOR p IN
    SELECT * FROM public.farm_partners
    WHERE batch_id IS NOT NULL
      AND cycle_status = 'open'
      AND allocated_birds IS NULL
      AND coalesce(batch_allocation_percentage, 0) = 0
  LOOP
    SELECT * INTO b FROM public.farm_batches WHERE id = p.batch_id;
    IF FOUND THEN
      calc_birds := NULL;
      IF b.funding_per_bird IS NOT NULL AND b.funding_per_bird > 0 AND p.initial_investment > 0 THEN
        IF abs(p.initial_investment * 100 - round(p.initial_investment / b.funding_per_bird) * round(b.funding_per_bird * 100)) <= 0.001 THEN
          SELECT coalesce(sum(birds), 0) INTO reserved_birds
          FROM public.batch_bird_allocations
          WHERE batch_id = b.id AND partner_id <> p.id AND voided_at IS NULL;
          IF round(p.initial_investment / b.funding_per_bird)::integer >= 1
             AND round(p.initial_investment / b.funding_per_bird)::integer + reserved_birds <= b.initial_headcount THEN
            calc_birds := round(p.initial_investment / b.funding_per_bird)::integer;
          END IF;
        END IF;
      END IF;

      IF calc_birds IS NOT NULL THEN
        UPDATE public.farm_partners
        SET allocated_birds = calc_birds,
            batch_allocation_percentage = 100.0 * calc_birds / b.initial_headcount,
            auto_sync_batch = true,
            updated_at = now()
        WHERE id = p.id;
      ELSE
        UPDATE public.farm_partners
        SET batch_allocation_percentage = 100,
            auto_sync_batch = true,
            updated_at = now()
        WHERE id = p.id;
      END IF;

      PERFORM public.reconcile_partner_batch(p.id);
      PERFORM public.reconcile_partner_commerce(p.id);
    END IF;
  END LOOP;
END $$;

-- Backfill partner_allocation_changes for any batch-linked partner missing an initial snapshot
INSERT INTO public.partner_allocation_changes(
  partner_id,
  source_event_id,
  cycle_name,
  before_fields,
  after_fields,
  before_financials,
  before_activities,
  created_at,
  snapshot_complete
)
SELECT
  p.id,
  (SELECT max(e.id) FROM public.record_audit_events e WHERE e.source_table = 'farm_partners' AND e.source_id = p.id),
  p.cycle_name,
  jsonb_build_object(
    'batch_id', NULL,
    'allocated_birds', NULL,
    'initial_investment', p.initial_investment,
    'batch_allocation_percentage', 0,
    'profit_share_percentage', p.profit_share_percentage,
    'loss_share_percentage', p.loss_share_percentage,
    'auto_sync_batch', false
  ),
  allocation_fields(to_jsonb(p)),
  '[]'::jsonb,
  '[]'::jsonb,
  p.created_at,
  true
FROM public.farm_partners p
WHERE p.batch_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.record_audit_events e WHERE e.source_table = 'farm_partners' AND e.source_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_allocation_changes c
    WHERE c.partner_id = p.id AND c.cycle_name = p.cycle_name
  )
ON CONFLICT (source_event_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.allocate_batch_investors(
  batch_id_input uuid,
  funding_input numeric,
  allocations_input jsonb,
  revision_input integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  b public.farm_batches;
  e jsonb;
  p public.farm_partners;
  n integer;
  total integer := 0;
  ids uuid[] := '{}';
BEGIN
  SELECT * INTO b FROM public.farm_batches WHERE id = batch_id_input FOR UPDATE;
  IF NOT FOUND OR b.status = 'archived' THEN
    RAISE EXCEPTION 'Choose an active or completed batch';
  END IF;
  IF b.allocation_revision <> revision_input THEN
    RAISE EXCEPTION 'Allocations changed. Reload and review the latest values';
  END IF;
  IF funding_input IS NULL OR funding_input <= 0 OR funding_input <> round(funding_input, 2) OR funding_input > 10000000000 THEN
    RAISE EXCEPTION 'Enter valid funding per bird (two decimal places)';
  END IF;
  IF jsonb_typeof(allocations_input) <> 'array' OR jsonb_array_length(allocations_input) = 0 THEN
    RAISE EXCEPTION 'Add at least one partner';
  END IF;
  IF jsonb_array_length(allocations_input) <> (SELECT count(DISTINCT x->>'partnerId') FROM jsonb_array_elements(allocations_input) x) THEN
    RAISE EXCEPTION 'Duplicate partner';
  END IF;

  FOR e IN SELECT * FROM jsonb_array_elements(allocations_input) ORDER BY value->>'partnerId' LOOP
    SELECT * INTO p FROM public.farm_partners WHERE id = (e->>'partnerId')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT p.active OR p.cycle_status <> 'open' THEN
      RAISE EXCEPTION 'All partners must have active open cycles';
    END IF;
    IF p.batch_id IS NOT NULL AND p.batch_id <> b.id THEN
      RAISE EXCEPTION 'This partner already belongs to another batch; open a new cycle first';
    END IF;
    n := (e->>'birds')::integer;
    IF n IS NULL OR n < 1 OR (e->>'birds')::numeric <> n THEN
      RAISE EXCEPTION 'Allocate whole birds';
    END IF;
    IF (e->>'profitSharePercentage')::numeric NOT BETWEEN 0 AND 100
       OR (e->>'lossSharePercentage')::numeric NOT BETWEEN 0 AND 100
       OR e->>'profitSharePercentage' IS NULL
       OR e->>'lossSharePercentage' IS NULL THEN
      RAISE EXCEPTION 'Profit and loss shares must be between 0 and 100';
    END IF;
    total := total + n;
    ids := array_append(ids, p.id);
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.farm_partners WHERE batch_id = b.id AND cycle_status = 'open' AND active AND NOT (id = ANY(ids))) THEN
    RAISE EXCEPTION 'Include every existing active partner. Close their cycle before removing them';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.farm_partners
    WHERE batch_id = b.id
      AND NOT (id = ANY(ids))
      AND allocated_birds IS NULL
      AND initial_investment > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.batch_bird_allocations h
        WHERE h.voided_at IS NULL AND h.partner_id = farm_partners.id AND h.batch_id = b.id AND h.cycle_name = farm_partners.cycle_name
      )
  ) THEN
    RAISE EXCEPTION 'An inactive or closed legacy allocation needs owner reconciliation before allocating this batch';
  END IF;

  total := total + coalesce((
    SELECT sum(birds) FROM public.batch_bird_allocations
    WHERE voided_at IS NULL AND batch_id = b.id AND (closed_at IS NOT NULL OR NOT (partner_id = ANY(ids)))
  ), 0);
  IF total > b.initial_headcount THEN
    RAISE EXCEPTION 'Allocated birds exceed initial batch capacity';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.batch_bird_allocations
    WHERE voided_at IS NULL AND batch_id = b.id AND (closed_at IS NOT NULL OR NOT (partner_id = ANY(ids)))
  ) AND b.funding_per_bird IS NOT NULL AND b.funding_per_bird IS DISTINCT FROM funding_input THEN
    RAISE EXCEPTION 'Funding is locked because this batch contains a closed partner cycle';
  END IF;

  UPDATE public.farm_batches
  SET funding_per_bird = funding_input,
      allocation_revision = allocation_revision + 1
  WHERE id = b.id;

  FOR e IN SELECT * FROM jsonb_array_elements(allocations_input) ORDER BY value->>'partnerId' LOOP
    UPDATE public.farm_partners
    SET batch_id = b.id,
        allocated_birds = (e->>'birds')::integer,
        initial_investment = funding_input * (e->>'birds')::integer,
        batch_allocation_percentage = 100.0 * (e->>'birds')::integer / b.initial_headcount,
        profit_share_percentage = (e->>'profitSharePercentage')::numeric,
        loss_share_percentage = (e->>'lossSharePercentage')::numeric,
        auto_sync_batch = true,
        updated_at = now()
    WHERE id = (e->>'partnerId')::uuid;
    PERFORM public.reconcile_partner_batch((e->>'partnerId')::uuid);
    PERFORM public.reconcile_partner_commerce((e->>'partnerId')::uuid);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.partner_undo_preview(partner_input uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p public.farm_partners;
  c public.partner_allocation_changes;
  why text;
  previous_batch public.farm_batches;
  current_batch public.farm_batches;
  previous_birds integer;
  effective_before jsonb;
  effective_change_id uuid;
BEGIN
  SELECT * INTO p FROM public.farm_partners WHERE id = partner_input;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  SELECT * INTO c
  FROM public.partner_allocation_changes
  WHERE partner_id = p.id AND cycle_name = p.cycle_name
  ORDER BY source_event_id DESC
  LIMIT 1;

  IF c.id IS NULL AND p.batch_id IS NULL THEN
    why := 'Previous allocation details were not recorded. Review this assignment manually.';
  ELSIF c.id IS NOT NULL AND c.undone_at IS NOT NULL THEN
    why := 'The last allocation change has already been undone.';
  ELSIF c.id IS NOT NULL AND NOT c.snapshot_complete THEN
    why := 'Previous linked records cannot be recovered reliably. Review this assignment manually.';
  ELSIF NOT p.active OR p.cycle_status = 'closed' OR p.settled_at IS NOT NULL OR p.settlement_snapshot IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.record_audit_events e
          WHERE e.source_table = 'farm_partners'
            AND e.source_id = p.id
            AND e.after_data->>'cycle_name' = p.cycle_name
            AND (e.after_data->>'cycle_status' = 'closed' OR e.after_data->>'settled_at' IS NOT NULL)
        ) THEN
    why := 'Closed or settled cycles cannot be undone.';
  ELSIF coalesce((to_jsonb(p)->>'agreement_signed')::boolean, false)
        OR EXISTS (
          SELECT 1 FROM public.record_audit_events e
          WHERE e.source_table = 'farm_partners'
            AND e.source_id = p.id
            AND e.after_data->>'cycle_name' = p.cycle_name
            AND e.after_data->>'agreement_signed' = 'true'
        )
        OR EXISTS (
          SELECT 1 FROM public.official_agreements a
          JOIN public.official_agreement_signatures s ON s.agreement_id = a.id
          WHERE a.partner_id = p.id AND a.cycle_name = p.cycle_name
        ) THEN
    why := 'An agreement has already been signed for this cycle. Undo is blocked.';
  ELSIF EXISTS (
    SELECT 1 FROM public.partner_financials
    WHERE partner_id = p.id AND type = 'payout' AND coalesce(cycle_name, p.cycle_name) = p.cycle_name
  ) THEN
    why := 'A payout has been recorded for this cycle. Undo is blocked.';
  END IF;

  IF c.id IS NOT NULL AND allocation_fields(to_jsonb(p)) = c.after_fields THEN
    effective_before := c.before_fields;
    effective_change_id := c.id;
  ELSIF p.batch_id IS NOT NULL THEN
    effective_before := jsonb_build_object(
      'batch_id', NULL,
      'allocated_birds', NULL,
      'initial_investment', p.initial_investment,
      'batch_allocation_percentage', 0,
      'profit_share_percentage', p.profit_share_percentage,
      'loss_share_percentage', p.loss_share_percentage,
      'auto_sync_batch', false
    );
    effective_change_id := coalesce(c.id, p.id);
  ELSE
    effective_before := c.before_fields;
    effective_change_id := c.id;
    IF why IS NULL THEN
      why := 'The allocation changed. Reload the partner workspace before undoing.';
    END IF;
  END IF;

  SELECT * INTO current_batch FROM public.farm_batches WHERE id = p.batch_id;
  SELECT * INTO previous_batch FROM public.farm_batches WHERE id = (effective_before->>'batch_id')::uuid;
  previous_birds := (effective_before->>'allocated_birds')::integer;

  IF why IS NULL AND c.id IS NOT NULL AND allocation_fields(to_jsonb(p)) = c.after_fields AND (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(c.before_financials) x
      WHERE NOT EXISTS (SELECT 1 FROM public.partner_financials f WHERE f.id = (x->>'id')::uuid AND f.partner_id = p.id)
        OR (x->>'source_financial_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.farm_financials f WHERE f.id = (x->>'source_financial_id')::uuid))
        OR (x->>'source_order_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.orders f WHERE f.id = (x->>'source_order_id')::uuid))
        OR (x->>'source_preorder_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.preorders f WHERE f.id = (x->>'source_preorder_id')::uuid))
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(c.before_activities) x
      WHERE NOT EXISTS (SELECT 1 FROM public.partner_activities a WHERE a.id = (x->>'id')::uuid AND a.partner_id = p.id)
        OR NOT EXISTS (SELECT 1 FROM public.farm_activities a WHERE a.id = (x->>'source_activity_id')::uuid)
    )
  ) THEN
    why := 'Original source history changed and cannot be restored reliably. Review this assignment manually.';
  END IF;

  IF why IS NULL AND previous_birds IS NOT NULL THEN
    IF previous_batch.id IS NULL OR previous_batch.status = 'archived' OR previous_batch.funding_per_bird * previous_birds <> (effective_before->>'initial_investment')::numeric THEN
      why := 'Shared batch funding changed. Review allocations together before restoring this assignment.';
    ELSIF previous_birds
          + coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE batch_id = previous_batch.id AND partner_id <> p.id AND voided_at IS NULL), 0)
          + coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE batch_id = previous_batch.id AND partner_id = p.id AND closed_at IS NOT NULL AND voided_at IS NULL), 0)
          > previous_batch.initial_headcount THEN
      why := 'Restoring the previous allocation would exceed batch capacity.';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'canUndo', why IS NULL,
    'reason', why,
    'changeId', effective_change_id,
    'partnerId', p.id,
    'partnerName', p.full_name,
    'cycleName', p.cycle_name,
    'allocationVersion', p.allocation_version,
    'batchRevision', current_batch.allocation_revision,
    'previousBatchRevision', previous_batch.allocation_revision,
    'current', allocation_fields(to_jsonb(p)) || jsonb_build_object('batch_name', current_batch.batch_name),
    'previous', CASE WHEN effective_before IS NULL THEN NULL ELSE effective_before || jsonb_build_object('batch_name', previous_batch.batch_name) END,
    'linkedFinancialCount', (
      SELECT count(*) FROM public.partner_financials
      WHERE partner_id = p.id AND removed_at IS NULL AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL)
    ),
    'linkedActivityCount', (
      SELECT count(*) FROM public.partner_activities
      WHERE partner_id = p.id AND removed_at IS NULL AND source_activity_id IS NOT NULL
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.undo_partner_allocation(
  partner_input uuid,
  change_input uuid,
  version_input bigint,
  batch_revision_input integer,
  previous_revision_input integer,
  reason_input text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p public.farm_partners;
  c public.partner_allocation_changes;
  preview jsonb;
  item jsonb;
  f public.partner_financials;
  a public.partner_activities;
  actor jsonb;
  target_before jsonb;
  restore_snapshots boolean := false;
BEGIN
  SELECT * INTO c FROM public.partner_allocation_changes WHERE id = change_input AND partner_id = partner_input;

  SELECT * INTO p FROM public.farm_partners WHERE id = partner_input FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  IF c.id IS NOT NULL THEN
    PERFORM id FROM public.farm_batches
    WHERE id IN ((c.before_fields->>'batch_id')::uuid, (c.after_fields->>'batch_id')::uuid, p.batch_id)
    ORDER BY id FOR UPDATE;
  ELSIF p.batch_id IS NOT NULL AND change_input = partner_input THEN
    PERFORM id FROM public.farm_batches WHERE id = p.batch_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Allocation change unavailable';
  END IF;

  preview := public.partner_undo_preview(partner_input);
  IF NOT (preview->>'canUndo')::boolean THEN
    RAISE EXCEPTION '%', preview->>'reason';
  END IF;
  IF (preview->>'changeId')::uuid <> change_input
     OR p.allocation_version <> version_input
     OR (preview->>'batchRevision')::integer IS DISTINCT FROM batch_revision_input
     OR (preview->>'previousBatchRevision')::integer IS DISTINCT FROM previous_revision_input THEN
    RAISE EXCEPTION 'Allocation changed. Reload the undo preview and review it again';
  END IF;
  IF length(trim(reason_input)) < 3 OR length(reason_input) > 500 THEN
    RAISE EXCEPTION 'Give a short reason for undoing this allocation';
  END IF;

  IF c.id IS NOT NULL AND allocation_fields(to_jsonb(p)) = c.after_fields THEN
    target_before := c.before_fields;
    restore_snapshots := true;
  ELSE
    target_before := jsonb_build_object(
      'batch_id', NULL,
      'allocated_birds', NULL,
      'initial_investment', p.initial_investment,
      'batch_allocation_percentage', 0,
      'profit_share_percentage', p.profit_share_percentage,
      'loss_share_percentage', p.loss_share_percentage,
      'auto_sync_batch', false
    );
  END IF;

  UPDATE public.partner_financials
  SET removed_at = now(),
      removal_reason = 'Allocation undone: ' || change_input
  WHERE partner_id = p.id
    AND removed_at IS NULL
    AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL);

  UPDATE public.partner_activities
  SET removed_at = now(),
      removal_reason = 'Allocation undone: ' || change_input
  WHERE partner_id = p.id
    AND removed_at IS NULL
    AND source_activity_id IS NOT NULL;

  IF restore_snapshots THEN
    FOR item IN SELECT value FROM jsonb_array_elements(c.before_financials) LOOP
      f := jsonb_populate_record(NULL::public.partner_financials, item);
      UPDATE public.partner_financials
      SET amount = f.amount,
          type = f.type,
          category = f.category,
          description = f.description,
          payment_method = f.payment_method,
          transaction_date = f.transaction_date,
          reference_no = f.reference_no,
          approval_status = f.approval_status,
          removed_at = NULL,
          removed_by = NULL,
          removal_reason = NULL
      WHERE id = f.id AND partner_id = p.id;
    END LOOP;

    FOR item IN SELECT value FROM jsonb_array_elements(c.before_activities) LOOP
      a := jsonb_populate_record(NULL::public.partner_activities, item);
      UPDATE public.partner_activities
      SET activity_date = a.activity_date,
          activity_type = a.activity_type,
          stock_headcount = a.stock_headcount,
          mortality_count = a.mortality_count,
          feed_consumed_kg = a.feed_consumed_kg,
          average_weight_kg = a.average_weight_kg,
          notes = a.notes,
          removed_at = NULL,
          removed_by = NULL,
          removal_reason = NULL
      WHERE id = a.id AND partner_id = p.id;
    END LOOP;
  END IF;

  PERFORM set_config('daf.undo_change', change_input::text, true);

  IF (target_before->>'batch_id')::uuid IS DISTINCT FROM p.batch_id OR target_before->>'allocated_birds' IS NULL THEN
    UPDATE public.batch_bird_allocations
    SET closed_at = now(),
        voided_at = now(),
        void_reason = reason_input
    WHERE partner_id = p.id AND closed_at IS NULL AND voided_at IS NULL;
  END IF;

  UPDATE public.farm_partners
  SET batch_id = (target_before->>'batch_id')::uuid,
      allocated_birds = (target_before->>'allocated_birds')::integer,
      initial_investment = (target_before->>'initial_investment')::numeric,
      batch_allocation_percentage = (target_before->>'batch_allocation_percentage')::numeric,
      profit_share_percentage = (target_before->>'profit_share_percentage')::numeric,
      loss_share_percentage = (target_before->>'loss_share_percentage')::numeric,
      auto_sync_batch = (target_before->>'auto_sync_batch')::boolean,
      updated_at = now()
  WHERE id = p.id;

  IF (target_before->>'auto_sync_batch')::boolean AND target_before->>'batch_id' IS NOT NULL THEN
    PERFORM public.reconcile_partner_batch(p.id);
    PERFORM public.reconcile_partner_commerce(p.id);
  END IF;

  UPDATE public.farm_batches
  SET allocation_revision = allocation_revision + 1
  WHERE id IN (p.batch_id, (target_before->>'batch_id')::uuid);

  UPDATE public.official_agreements
  SET status = 'superseded'
  WHERE partner_id = p.id
    AND cycle_name = p.cycle_name
    AND status = 'draft'
    AND (
      (snapshot->'deal'->>'capital')::numeric IS DISTINCT FROM (target_before->>'initial_investment')::numeric
      OR (snapshot->'deal'->>'partnerProfit')::numeric IS DISTINCT FROM (target_before->>'profit_share_percentage')::numeric
      OR (target_before->>'allocated_birds' IS NOT NULL AND (snapshot->'deal'->>'birds')::integer IS DISTINCT FROM (target_before->>'allocated_birds')::integer)
      OR (target_before->>'batch_id' IS NULL)
    );

  actor := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb->>'x-daf-actor';
  IF c.id IS NOT NULL AND c.undone_at IS NULL THEN
    UPDATE public.partner_allocation_changes
    SET undone_at = now(),
        undone_by = coalesce(actor->>'username', 'owner'),
        undo_reason = trim(reason_input)
    WHERE id = c.id;
  END IF;

  PERFORM set_config('daf.undo_change', '', true);
END $$;

REVOKE ALL ON FUNCTION
  public.capture_allocation_change(),
  public.allocate_batch_investors(uuid, numeric, jsonb, integer),
  public.partner_undo_preview(uuid),
  public.undo_partner_allocation(uuid, uuid, bigint, integer, integer, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.capture_allocation_change(),
  public.allocate_batch_investors(uuid, numeric, jsonb, integer),
  public.partner_undo_preview(uuid),
  public.undo_partner_allocation(uuid, uuid, bigint, integer, integer, text)
TO service_role;

