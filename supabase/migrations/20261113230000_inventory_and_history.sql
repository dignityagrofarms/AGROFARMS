CREATE OR REPLACE FUNCTION public.batch_stock_summary(batch_ids uuid[])
RETURNS TABLE(batch_id uuid,total_mortality bigint,total_birds_sold numeric,total_adjustments bigint,live_birds numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT b.id, coalesce(a.dead,0), coalesce(f.sold,0)+coalesce(c.sold,0)+coalesce(o.sold,0)+coalesce(p.sold,0),
   coalesce(adj.quantity,0), b.initial_headcount-coalesce(a.dead,0)-coalesce(f.sold,0)-coalesce(c.sold,0)-coalesce(o.sold,0)-coalesce(p.sold,0)+coalesce(adj.quantity,0)
 FROM public.farm_batches b
 LEFT JOIN LATERAL (SELECT sum(mortality_count) dead FROM public.farm_activities WHERE batch_id=b.id AND approval_status='approved') a ON true
 LEFT JOIN LATERAL (SELECT sum(coalesce(birds_sold,0)) sold FROM public.farm_financials WHERE batch_id=b.id AND type='income' AND approval_status='approved') f ON true
 LEFT JOIN LATERAL (SELECT sum(quantity) sold FROM public.contact_transactions WHERE batch_id=b.id AND NOT sync_to_farm AND transaction_type='sale_to_contact' AND approval_status='approved'
  AND (coalesce(unit,'')||' '||item_description) ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND (coalesce(unit,'')||' '||item_description) !~* '(egg|crate|manure)') c ON true
 LEFT JOIN LATERAL (SELECT sum((item->>'qty')::numeric) sold FROM public.orders ord CROSS JOIN LATERAL jsonb_array_elements(ord.items::jsonb) item
  WHERE ord.batch_id=b.id AND ord.status='delivered' AND (item->>'product') ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND (item->>'product') !~* '(egg|crate|manure)') o ON true
 LEFT JOIN LATERAL (SELECT sum(quantity) sold FROM public.preorders WHERE batch_id=b.id AND delivery_status='delivered' AND product ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND product !~* '(egg|crate|manure)') p ON true
 LEFT JOIN LATERAL (SELECT sum(quantity) quantity FROM public.batch_stock_adjustments WHERE batch_id=b.id) adj ON true
 WHERE b.id=ANY(batch_ids);
$$;
REVOKE ALL ON FUNCTION public.batch_stock_summary(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_stock_summary(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.close_batch_reconciled(batch_id_input uuid, reason_input text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining numeric; actor jsonb; BEGIN
 PERFORM 1 FROM public.farm_batches WHERE id=batch_id_input FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
 IF length(trim(coalesce(reason_input,'')))=0 THEN RAISE EXCEPTION 'An owner reconciliation reason is required'; END IF;
 actor := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-daf-actor';
 IF actor->>'role' IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Owner required'; END IF;
 SELECT live_birds INTO remaining FROM public.batch_stock_summary(ARRAY[batch_id_input]);
 IF remaining <> 0 THEN
  INSERT INTO public.batch_stock_adjustments(batch_id,quantity,reason,recorded_by) VALUES(batch_id_input,-remaining::integer,reason_input,actor->>'username');
 END IF;
 UPDATE public.farm_batches SET status='completed', current_headcount=0,closed_at=coalesce(closed_at,now()),closed_by=actor->>'username',updated_at=now() WHERE id=batch_id_input;
END $$;
REVOKE ALL ON FUNCTION public.close_batch_reconciled(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_batch_reconciled(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_feed_usage() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bought numeric; earlier numeric; later numeric; finished numeric; BEGIN
 IF NEW.approval_status <> 'approved' OR NEW.feed_bag_no IS NULL THEN RETURN NEW; END IF;
 PERFORM 1 FROM public.farm_batches WHERE id=NEW.batch_id FOR UPDATE;
 IF NEW.feed_bag_no < 1 OR NEW.feed_bag_status IS NULL THEN RAISE EXCEPTION 'Bag number and status are required'; END IF;
 finished := coalesce(NEW.feed_bags_used,CASE WHEN NEW.feed_bag_status='finished' THEN NEW.feed_bag_no ELSE NEW.feed_bag_no-1 END);
 IF finished <> (CASE WHEN NEW.feed_bag_status='finished' THEN NEW.feed_bag_no ELSE NEW.feed_bag_no-1 END) THEN RAISE EXCEPTION 'Cumulative bags must match the sequential bag number and status'; END IF;
 SELECT coalesce(sum(feed_bags),0) INTO bought FROM public.farm_financials WHERE batch_id=NEW.batch_id AND type='expense' AND category ILIKE '%feed%' AND approval_status='approved';
 IF NEW.feed_bag_no>bought THEN RAISE EXCEPTION 'Log approved feed purchases before consuming this bag; complete missing historical quantities first'; END IF;
 SELECT max(feed_bags_used) INTO earlier FROM public.farm_activities WHERE batch_id=NEW.batch_id AND id<>NEW.id AND approval_status='approved' AND activity_date<NEW.activity_date;
 SELECT min(feed_bags_used) INTO later FROM public.farm_activities WHERE batch_id=NEW.batch_id AND id<>NEW.id AND approval_status='approved' AND activity_date>NEW.activity_date;
 IF finished<coalesce(earlier,0) OR (later IS NOT NULL AND finished>later) THEN RAISE EXCEPTION 'Bag sequence conflicts with earlier or later reports'; END IF;
 IF NEW.feed_bag_status='finished' AND EXISTS(SELECT 1 FROM public.farm_activities WHERE batch_id=NEW.batch_id AND id<>NEW.id AND approval_status='approved' AND feed_bag_no=NEW.feed_bag_no AND feed_bag_status='finished') THEN RAISE EXCEPTION 'This bag has already been finished'; END IF;
 NEW.feed_bags_used:=finished;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_feed BEFORE INSERT OR UPDATE ON public.farm_activities FOR EACH ROW EXECUTE FUNCTION public.validate_feed_usage();
REVOKE ALL ON FUNCTION public.validate_feed_usage() FROM PUBLIC;

-- Snapshot prior records honestly: reviewer and original decision time are unknown.
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['farm_financials','farm_activities','contact_transactions','farm_financial_payments'] LOOP
  EXECUTE format('INSERT INTO public.record_audit_events(source_table,source_id,action,recorded_by,after_data,revision)
    SELECT %L,id,''legacy_snapshot'',recorded_by,to_jsonb(t),0 FROM public.%I t
    WHERE NOT EXISTS(SELECT 1 FROM public.record_audit_events e WHERE e.source_table=%L AND e.source_id=t.id)',tbl,tbl,tbl);
 END LOOP;
END $$;
