-- Preserve archived cycles: only current, non-removed copies participate in uniqueness.
DROP INDEX public.partner_financial_source;
DROP INDEX public.partner_activity_source;
CREATE UNIQUE INDEX partner_financial_source ON public.partner_financials(partner_id, source_financial_id)
 WHERE source_financial_id IS NOT NULL AND removed_at IS NULL;
CREATE UNIQUE INDEX partner_activity_source ON public.partner_activities(partner_id, source_activity_id)
 WHERE source_activity_id IS NOT NULL AND removed_at IS NULL;

-- Backfill only unambiguous current source links; retain all legacy rows and values.
UPDATE public.partner_financials pf SET source_financial_id = f.id
FROM public.farm_financials f
WHERE pf.removed_at IS NULL AND pf.source_financial_id IS NULL AND pf.batch_id = f.batch_id
 AND pf.reference_no = 'BATCH-SYNC-' || left(f.id::text,8)
 AND (SELECT count(*) FROM public.farm_financials f2 WHERE left(f2.id::text,8) = left(f.id::text,8)) = 1
 AND (SELECT count(*) FROM public.partner_financials p2 WHERE p2.partner_id = pf.partner_id AND p2.reference_no = pf.reference_no AND p2.removed_at IS NULL) = 1;
UPDATE public.partner_activities pa SET source_activity_id = a.id
FROM public.farm_activities a
WHERE pa.removed_at IS NULL AND pa.source_activity_id IS NULL AND pa.batch_id = a.batch_id
 AND pa.notes LIKE '%[SYNC:' || left(a.id::text,8) || ']%'
 AND (SELECT count(*) FROM public.farm_activities a2 WHERE left(a2.id::text,8) = left(a.id::text,8)) = 1
 AND (SELECT count(*) FROM public.partner_activities p2 WHERE p2.partner_id = pa.partner_id AND p2.notes LIKE '%[SYNC:' || left(a.id::text,8) || ']%' AND p2.removed_at IS NULL) = 1;

CREATE FUNCTION public.reconcile_partner_batch(partner_id_input uuid, allocation_input numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE partner public.farm_partners; ratio numeric; cutoff date; BEGIN
 SELECT * INTO partner FROM public.farm_partners WHERE id = partner_id_input FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
 IF partner.batch_id IS NULL OR partner.cycle_status = 'closed' THEN RETURN; END IF;
 ratio := coalesce(allocation_input, partner.batch_allocation_percentage,100) / 100;
 IF ratio < 0 OR ratio > 1 THEN RAISE EXCEPTION 'Invalid allocation'; END IF;
 SELECT least(start_date, partner.cycle_start_date) INTO cutoff FROM public.farm_batches WHERE id = partner.batch_id;
 UPDATE public.partner_financials pf SET removed_at = now(), removal_reason = 'Source changed, deleted or unapproved'
 WHERE pf.partner_id = partner.id AND pf.source_financial_id IS NOT NULL AND pf.removed_at IS NULL
 AND NOT EXISTS (SELECT 1 FROM public.farm_financials f WHERE f.id = pf.source_financial_id AND f.batch_id = partner.batch_id
   AND coalesce(f.approval_status,'approved') = 'approved' AND (cutoff IS NULL OR f.transaction_date >= cutoff));
 INSERT INTO public.partner_financials(partner_id,batch_id,source_financial_id,type,category,amount,description,payment_method,
   transaction_date,reference_no,recorded_by,approval_status,approved_by,approved_at,cycle_name)
 SELECT partner.id,f.batch_id,f.id,f.type,f.category,
   round((CASE WHEN f.type='income' THEN coalesce(f.amount_paid,f.amount) ELSE f.amount END)*ratio,2),
   f.description,f.payment_method,f.transaction_date,'BATCH-SYNC-'||f.id::text,f.recorded_by,'approved','system',now(),partner.cycle_name
 FROM public.farm_financials f WHERE f.batch_id=partner.batch_id AND coalesce(f.approval_status,'approved')='approved'
   AND (cutoff IS NULL OR f.transaction_date >= cutoff)
 ON CONFLICT (partner_id,source_financial_id) WHERE source_financial_id IS NOT NULL AND removed_at IS NULL
 DO UPDATE SET amount=excluded.amount,description=excluded.description,type=excluded.type,category=excluded.category,
 transaction_date=excluded.transaction_date,payment_method=excluded.payment_method,approval_status='approved'
 WHERE (partner_financials.amount,partner_financials.description,partner_financials.type,partner_financials.category,partner_financials.transaction_date,partner_financials.payment_method,partner_financials.approval_status) IS DISTINCT FROM (excluded.amount,excluded.description,excluded.type,excluded.category,excluded.transaction_date,excluded.payment_method,excluded.approval_status);
 UPDATE public.partner_activities pa SET removed_at=now(),removal_reason='Source changed, deleted or unapproved'
 WHERE pa.partner_id=partner.id AND pa.source_activity_id IS NOT NULL AND pa.removed_at IS NULL
 AND NOT EXISTS (SELECT 1 FROM public.farm_activities a WHERE a.id=pa.source_activity_id AND a.batch_id=partner.batch_id
   AND coalesce(a.approval_status,'approved')='approved' AND (cutoff IS NULL OR a.activity_date>=cutoff));
 INSERT INTO public.partner_activities(partner_id,batch_id,source_activity_id,activity_date,activity_type,stock_headcount,mortality_count,
   cause_of_mortality,feed_consumed_kg,average_weight_kg,notes,recorded_by,approval_status,approved_by,approved_at,cycle_name)
 SELECT partner.id,a.batch_id,a.id,a.activity_date,
   CASE WHEN a.activity_type IN ('Feeding','Mortality Record','Weight Check','Medication / Vaccination','Cleaning & Sanitation')
     THEN a.activity_type ELSE 'General Note' END,0,round(a.mortality_count*ratio)::integer,a.cause_of_mortality,
   round(a.feed_consumed_kg*ratio,1),0,coalesce(a.notes,a.activity_type)||' [SYNC:'||a.id::text||']',a.recorded_by,'approved','system',now(),partner.cycle_name
 FROM public.farm_activities a WHERE a.batch_id=partner.batch_id AND coalesce(a.approval_status,'approved')='approved'
   AND (cutoff IS NULL OR a.activity_date>=cutoff)
 ON CONFLICT (partner_id,source_activity_id) WHERE source_activity_id IS NOT NULL AND removed_at IS NULL
 DO UPDATE SET activity_date=excluded.activity_date,activity_type=excluded.activity_type,mortality_count=excluded.mortality_count,
   feed_consumed_kg=excluded.feed_consumed_kg,cause_of_mortality=excluded.cause_of_mortality,notes=excluded.notes,approval_status='approved'
 WHERE (partner_activities.activity_date,partner_activities.activity_type,partner_activities.mortality_count,partner_activities.feed_consumed_kg,partner_activities.cause_of_mortality,partner_activities.notes,partner_activities.approval_status) IS DISTINCT FROM (excluded.activity_date,excluded.activity_type,excluded.mortality_count,excluded.feed_consumed_kg,excluded.cause_of_mortality,excluded.notes,excluded.approval_status);
END $$;
REVOKE ALL ON FUNCTION public.reconcile_partner_batch(uuid,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_partner_batch(uuid,numeric) TO service_role;
CREATE FUNCTION public.reconcile_changed_batch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; old_batch uuid; new_batch uuid; BEGIN
 IF TG_OP <> 'INSERT' THEN old_batch := OLD.batch_id; END IF;
 IF TG_OP <> 'DELETE' THEN new_batch := NEW.batch_id; END IF;
 FOR p IN SELECT id FROM public.farm_partners WHERE batch_id IN (old_batch,new_batch) AND auto_sync_batch AND cycle_status <> 'closed' ORDER BY id LOOP
   PERFORM public.reconcile_partner_batch(p.id);
 END LOOP;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER reconcile_partner_source AFTER INSERT OR UPDATE OR DELETE ON public.farm_financials FOR EACH ROW EXECUTE FUNCTION public.reconcile_changed_batch();
CREATE TRIGGER reconcile_partner_source AFTER INSERT OR UPDATE OR DELETE ON public.farm_activities FOR EACH ROW EXECUTE FUNCTION public.reconcile_changed_batch();
REVOKE ALL ON FUNCTION public.reconcile_changed_batch() FROM PUBLIC;

-- Removing a source retires live copies without erasing archived settlement evidence.
CREATE FUNCTION public.retire_partner_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='farm_financials' THEN
  UPDATE public.partner_financials SET removed_at=now(),removal_reason='Source deleted'
   WHERE source_financial_id=OLD.id AND removed_at IS NULL;
 ELSE
  UPDATE public.partner_activities SET removed_at=now(),removal_reason='Source deleted'
   WHERE source_activity_id=OLD.id AND removed_at IS NULL;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER retire_partner_source BEFORE DELETE ON public.farm_financials FOR EACH ROW EXECUTE FUNCTION public.retire_partner_source();
CREATE TRIGGER retire_partner_source BEFORE DELETE ON public.farm_activities FOR EACH ROW EXECUTE FUNCTION public.retire_partner_source();
REVOKE ALL ON FUNCTION public.retire_partner_source() FROM PUBLIC;
