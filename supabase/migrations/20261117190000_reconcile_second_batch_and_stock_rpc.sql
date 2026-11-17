-- Migration: Update batch_stock_summary to include approved online orders and reconcile Second Batch headcount to 0

CREATE OR REPLACE FUNCTION public.batch_stock_summary(batch_ids uuid[])
RETURNS TABLE(batch_id uuid, total_mortality bigint, total_birds_sold numeric, total_adjustments bigint, live_birds numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT b.id,
   coalesce(a.dead,0),
   coalesce(f.sold,0) + coalesce(c.sold,0) + coalesce(o.sold,0) + coalesce(p.sold,0),
   coalesce(adj.quantity,0),
   GREATEST(0, b.initial_headcount - coalesce(a.dead,0) - coalesce(f.sold,0) - coalesce(c.sold,0) - coalesce(o.sold,0) - coalesce(p.sold,0) + coalesce(adj.quantity,0))
 FROM public.farm_batches b
 LEFT JOIN LATERAL (
   SELECT sum(mortality_count) dead
   FROM public.farm_activities
   WHERE batch_id = b.id AND approval_status = 'approved'
 ) a ON true
 LEFT JOIN LATERAL (
   SELECT sum(coalesce(birds_sold,0)) sold
   FROM public.farm_financials
   WHERE batch_id = b.id AND type = 'income' AND approval_status = 'approved'
 ) f ON true
 LEFT JOIN LATERAL (
   SELECT sum(quantity) sold
   FROM public.contact_transactions
   WHERE batch_id = b.id AND NOT sync_to_farm AND transaction_type = 'sale_to_contact' AND approval_status = 'approved'
     AND (coalesce(unit,'') || ' ' || item_description) ~* '(bird|broiler|chicken|hen|layer|cockerel)'
     AND (coalesce(unit,'') || ' ' || item_description) !~* '(egg|crate|manure)'
 ) c ON true
 LEFT JOIN LATERAL (
   SELECT sum((item->>'qty')::numeric) sold
   FROM public.orders ord
   CROSS JOIN LATERAL jsonb_array_elements(ord.items::jsonb) item
   WHERE ord.batch_id = b.id
     AND (ord.status = 'delivered' OR (ord.payment_status = 'approved' AND ord.status NOT IN ('cancelled')))
     AND (item->>'product') ~* '(bird|broiler|chicken|hen|layer|cockerel)'
     AND (item->>'product') !~* '(egg|crate|manure)'
 ) o ON true
 LEFT JOIN LATERAL (
   SELECT sum(quantity) sold
   FROM public.preorders
   WHERE batch_id = b.id
     AND (delivery_status = 'delivered' OR (payment_status = 'approved' AND delivery_status NOT IN ('cancelled')))
     AND product ~* '(bird|broiler|chicken|hen|layer|cockerel)'
     AND product !~* '(egg|crate|manure)'
 ) p ON true
 LEFT JOIN LATERAL (
   SELECT sum(quantity) quantity
   FROM public.batch_stock_adjustments
   WHERE batch_id = b.id
 ) adj ON true
 WHERE b.id = ANY(batch_ids);
$$;

REVOKE ALL ON FUNCTION public.batch_stock_summary(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_stock_summary(uuid[]) TO service_role;

-- Reconcile SECOND BATCH (October/November) to 0 remaining birds
DO $$
DECLARE
  second_batch_id uuid := '60b4f2b3-8af1-46f6-826f-21289a3cc936';
  remaining_stock numeric;
BEGIN
  SELECT live_birds INTO remaining_stock
  FROM public.batch_stock_summary(ARRAY[second_batch_id]);

  IF remaining_stock IS NOT NULL AND remaining_stock > 0 THEN
    INSERT INTO public.batch_stock_adjustments(batch_id, quantity, reason, recorded_by)
    VALUES (
      second_batch_id,
      -remaining_stock::integer,
      'Batch completely sold out - Owner Headcount Reconciliation (12 mortalities and all birds sold)',
      'owner'
    );
  END IF;

  UPDATE public.farm_batches
  SET current_headcount = 0,
      updated_at = now()
  WHERE id = second_batch_id;
END $$;
