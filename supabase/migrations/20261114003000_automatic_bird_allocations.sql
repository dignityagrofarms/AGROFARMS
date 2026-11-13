ALTER TABLE public.farm_batches ADD COLUMN funding_per_bird numeric(14,2) CHECK(funding_per_bird>0), ADD COLUMN allocation_revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.farm_partners ADD COLUMN allocated_birds integer CHECK(allocated_birds>0);
ALTER TABLE public.farm_partners ALTER COLUMN batch_allocation_percentage TYPE numeric(18,12);
CREATE TABLE public.batch_bird_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partner_id uuid NOT NULL REFERENCES public.farm_partners(id) ON DELETE RESTRICT,
 batch_id uuid NOT NULL REFERENCES public.farm_batches(id) ON DELETE RESTRICT,cycle_name text NOT NULL,birds integer NOT NULL CHECK(birds>0),
 funding_per_bird numeric(14,2) NOT NULL CHECK(funding_per_bird>0),closed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX current_partner_bird_allocation ON public.batch_bird_allocations(partner_id) WHERE closed_at IS NULL;
ALTER TABLE public.batch_bird_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.batch_bird_allocations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.batch_bird_allocations TO service_role;
CREATE POLICY bird_allocation_server ON public.batch_bird_allocations FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE TRIGGER bird_allocation_audit AFTER INSERT OR UPDATE ON public.batch_bird_allocations FOR EACH ROW EXECUTE FUNCTION public.capture_record_audit();
-- No legacy money, ownership or signed agreement is changed by installation.
DROP FUNCTION public.allocate_batch_investors(uuid,jsonb);
CREATE FUNCTION public.allocate_batch_investors(batch_id_input uuid,funding_input numeric,allocations_input jsonb,revision_input integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.farm_batches; e jsonb; p public.farm_partners; n integer; total integer:=0; ids uuid[]:='{}'; BEGIN
 SELECT * INTO b FROM public.farm_batches WHERE id=batch_id_input FOR UPDATE;
 IF NOT FOUND OR b.status<>'active' THEN RAISE EXCEPTION 'Choose an active batch'; END IF;
 IF b.allocation_revision<>revision_input THEN RAISE EXCEPTION 'Allocations changed. Reload and review the latest values'; END IF;
 IF funding_input IS NULL OR funding_input<=0 OR funding_input<>round(funding_input,2) OR funding_input>10000000000 THEN RAISE EXCEPTION 'Enter valid funding per bird (two decimal places)'; END IF;
 IF jsonb_typeof(allocations_input)<>'array' OR jsonb_array_length(allocations_input)=0 THEN RAISE EXCEPTION 'Add at least one partner'; END IF;
 IF jsonb_array_length(allocations_input)<>(SELECT count(DISTINCT x->>'partnerId') FROM jsonb_array_elements(allocations_input)x) THEN RAISE EXCEPTION 'Duplicate partner'; END IF;
 FOR e IN SELECT * FROM jsonb_array_elements(allocations_input) ORDER BY value->>'partnerId' LOOP
  SELECT * INTO p FROM public.farm_partners WHERE id=(e->>'partnerId')::uuid FOR UPDATE;
  IF NOT FOUND OR NOT p.active OR p.cycle_status<>'open' THEN RAISE EXCEPTION 'All partners must have active open cycles'; END IF;
  IF p.batch_id IS NOT NULL AND p.batch_id<>b.id THEN RAISE EXCEPTION 'This partner already belongs to another batch; open a new cycle first'; END IF;
  n:=(e->>'birds')::integer;
  IF n IS NULL OR n<1 OR (e->>'birds')::numeric<>n THEN RAISE EXCEPTION 'Allocate whole birds'; END IF;
  IF (e->>'profitSharePercentage')::numeric NOT BETWEEN 0 AND 100 OR (e->>'lossSharePercentage')::numeric NOT BETWEEN 0 AND 100 OR e->>'profitSharePercentage' IS NULL OR e->>'lossSharePercentage' IS NULL THEN RAISE EXCEPTION 'Profit and loss shares must be between 0 and 100'; END IF;
  total:=total+n; ids:=array_append(ids,p.id);
 END LOOP;
 -- Requiring the complete active roster prevents silently detaching a retained ledger.
 IF EXISTS(SELECT 1 FROM public.farm_partners WHERE batch_id=b.id AND cycle_status='open' AND active AND NOT(id=ANY(ids))) THEN RAISE EXCEPTION 'Include every existing active partner. Close their cycle before removing them'; END IF;
 IF EXISTS(SELECT 1 FROM public.farm_partners WHERE batch_id=b.id AND NOT(id=ANY(ids)) AND allocated_birds IS NULL AND initial_investment>0 AND NOT EXISTS(SELECT 1 FROM public.batch_bird_allocations h WHERE h.partner_id=farm_partners.id AND h.batch_id=b.id AND h.cycle_name=farm_partners.cycle_name)) THEN RAISE EXCEPTION 'An inactive or closed legacy allocation needs owner reconciliation before allocating this batch'; END IF;
 total:=total+coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE batch_id=b.id AND (closed_at IS NOT NULL OR NOT(partner_id=ANY(ids)))),0);
 IF total>b.initial_headcount THEN RAISE EXCEPTION 'Allocated birds exceed initial batch capacity'; END IF;
 IF EXISTS(SELECT 1 FROM public.batch_bird_allocations WHERE batch_id=b.id AND (closed_at IS NOT NULL OR NOT(partner_id=ANY(ids)))) AND b.funding_per_bird IS NOT NULL AND b.funding_per_bird IS DISTINCT FROM funding_input THEN RAISE EXCEPTION 'Funding is locked because this batch contains a closed partner cycle'; END IF;
 UPDATE public.farm_batches SET funding_per_bird=funding_input,allocation_revision=allocation_revision+1 WHERE id=b.id;
 FOR e IN SELECT * FROM jsonb_array_elements(allocations_input) ORDER BY value->>'partnerId' LOOP
  UPDATE public.farm_partners SET batch_id=b.id,allocated_birds=(e->>'birds')::integer,
   initial_investment=funding_input*(e->>'birds')::integer,
   batch_allocation_percentage=100.0*(e->>'birds')::integer/b.initial_headcount,
   profit_share_percentage=(e->>'profitSharePercentage')::numeric,loss_share_percentage=(e->>'lossSharePercentage')::numeric,
   auto_sync_batch=true,updated_at=now() WHERE id=(e->>'partnerId')::uuid;
  PERFORM public.reconcile_partner_batch((e->>'partnerId')::uuid);
  PERFORM public.reconcile_partner_commerce((e->>'partnerId')::uuid);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.allocate_batch_investors(uuid,numeric,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_batch_investors(uuid,numeric,jsonb,integer) TO service_role;
CREATE FUNCTION public.protect_bird_allocation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE b public.farm_batches; BEGIN
 IF NEW.allocated_birds IS NOT NULL THEN
  SELECT * INTO b FROM public.farm_batches WHERE id=NEW.batch_id;
  IF b.funding_per_bird IS NULL OR NEW.allocated_birds>b.initial_headcount THEN RAISE EXCEPTION 'Use Allocate Partners to confirm this allocation'; END IF;
  IF NEW.initial_investment<>b.funding_per_bird*NEW.allocated_birds OR abs(NEW.batch_allocation_percentage-100.0*NEW.allocated_birds/b.initial_headcount)>0.001 THEN RAISE EXCEPTION 'Bird ownership and capital are calculated in Allocate Partners'; END IF;
  IF TG_OP='UPDATE' AND OLD.cycle_status='closed' AND (NEW.allocated_birds IS DISTINCT FROM OLD.allocated_birds OR NEW.initial_investment<>OLD.initial_investment OR NEW.batch_id IS DISTINCT FROM OLD.batch_id) AND NEW.cycle_name=OLD.cycle_name THEN RAISE EXCEPTION 'Closed allocations are frozen'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_bird_allocation BEFORE INSERT OR UPDATE ON public.farm_partners FOR EACH ROW EXECUTE FUNCTION public.protect_bird_allocation();
CREATE FUNCTION public.protect_batch_funding() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.initial_headcount<>OLD.initial_headcount AND EXISTS(SELECT 1 FROM public.batch_bird_allocations WHERE batch_id=OLD.id) THEN RAISE EXCEPTION 'Initial headcount is locked after ownership allocation; record a stock adjustment instead'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_batch_funding BEFORE UPDATE ON public.farm_batches FOR EACH ROW EXECUTE FUNCTION public.protect_batch_funding();
REVOKE ALL ON FUNCTION public.protect_bird_allocation(),public.protect_batch_funding() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.protect_bird_allocation(),public.protect_batch_funding() TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_partner_batch(partner_id_input uuid, allocation_input numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE partner public.farm_partners; ratio numeric; cutoff date; BEGIN
 SELECT * INTO partner FROM public.farm_partners WHERE id = partner_id_input FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
 IF partner.batch_id IS NULL OR partner.cycle_status = 'closed' THEN RETURN; END IF;
 ratio := CASE WHEN partner.allocated_birds IS NOT NULL THEN partner.allocated_birds::numeric/(SELECT initial_headcount FROM public.farm_batches WHERE id=partner.batch_id) ELSE coalesce(partner.batch_allocation_percentage,100)/100 END;
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

CREATE OR REPLACE FUNCTION public.reconcile_partner_commerce(partner_id_input uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.farm_partners; ratio numeric; BEGIN
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_id_input FOR UPDATE;
 IF NOT FOUND OR p.batch_id IS NULL OR p.cycle_status='closed' THEN RETURN; END IF;
 ratio:=CASE WHEN p.allocated_birds IS NOT NULL THEN p.allocated_birds::numeric/(SELECT initial_headcount FROM public.farm_batches WHERE id=p.batch_id) ELSE p.batch_allocation_percentage/100 END;
 UPDATE public.partner_financials pf SET removed_at=now(),removal_reason='Order cancelled, reassigned or unapproved'
 WHERE pf.partner_id=p.id AND pf.source_order_id IS NOT NULL AND pf.removed_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=pf.source_order_id AND o.batch_id=p.batch_id AND o.payment_status='approved' AND o.status<>'cancelled');
 UPDATE public.partner_financials pf SET removed_at=now(),removal_reason='Preorder reassigned or payment reversed'
 WHERE pf.partner_id=p.id AND pf.source_preorder_id IS NOT NULL AND pf.removed_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.preorders o WHERE o.id=pf.source_preorder_id AND o.batch_id=p.batch_id AND o.amount_paid>0);
 INSERT INTO public.partner_financials(partner_id,batch_id,source_order_id,type,category,amount,description,payment_method,transaction_date,reference_no,approval_status,cycle_name)
 SELECT p.id,o.batch_id,o.id,'income','Store Order',round(o.total*ratio,2),'Storefront receipt '||o.order_code,'Bank Transfer',coalesce(o.payment_approved_at,o.created_at)::date,'ORDER-SYNC-'||o.id::text,'approved',p.cycle_name
 FROM public.orders o WHERE o.batch_id=p.batch_id AND o.payment_status='approved' AND o.status<>'cancelled'
 ON CONFLICT(partner_id,source_order_id) WHERE source_order_id IS NOT NULL AND removed_at IS NULL
 DO UPDATE SET amount=excluded.amount,transaction_date=excluded.transaction_date
 WHERE (partner_financials.amount,partner_financials.transaction_date) IS DISTINCT FROM (excluded.amount,excluded.transaction_date);
 INSERT INTO public.partner_financials(partner_id,batch_id,source_preorder_id,type,category,amount,description,payment_method,transaction_date,reference_no,approval_status,cycle_name)
 SELECT p.id,o.batch_id,o.id,'income','December Pre-Order',round(o.amount_paid*ratio,2),'Preorder receipts '||o.preorder_code,'Bank Transfer',o.created_at::date,'PREORDER-SYNC-'||o.id::text,'approved',p.cycle_name
 FROM public.preorders o WHERE o.batch_id=p.batch_id AND o.amount_paid>0
 ON CONFLICT(partner_id,source_preorder_id) WHERE source_preorder_id IS NOT NULL AND removed_at IS NULL
 DO UPDATE SET amount=excluded.amount WHERE partner_financials.amount IS DISTINCT FROM excluded.amount;
END $$;

CREATE FUNCTION public.track_bird_allocation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_cycle text; BEGIN
 IF TG_OP='UPDATE' THEN
  old_cycle:=OLD.cycle_name;
  IF NEW.allocated_birds IS NULL OR NEW.cycle_status='closed' OR NEW.batch_id IS DISTINCT FROM OLD.batch_id OR (OLD.cycle_status='closed' AND NEW.cycle_name<>OLD.cycle_name) THEN
   UPDATE public.batch_bird_allocations SET closed_at=now() WHERE partner_id=NEW.id AND closed_at IS NULL;
  END IF;
  IF OLD.cycle_status='closed' AND NEW.cycle_status='open' AND NEW.cycle_name=OLD.cycle_name AND NEW.batch_id=OLD.batch_id AND NEW.allocated_birds IS NOT NULL THEN
   UPDATE public.batch_bird_allocations SET closed_at=NULL WHERE id=(SELECT id FROM public.batch_bird_allocations WHERE partner_id=NEW.id AND batch_id=NEW.batch_id AND cycle_name=NEW.cycle_name ORDER BY created_at DESC LIMIT 1);
  END IF;
 END IF;
 IF NEW.allocated_birds IS NOT NULL AND NEW.cycle_status='open' THEN
  INSERT INTO public.batch_bird_allocations(partner_id,batch_id,cycle_name,birds,funding_per_bird)
  SELECT NEW.id,NEW.batch_id,NEW.cycle_name,NEW.allocated_birds,funding_per_bird FROM public.farm_batches WHERE id=NEW.batch_id
  ON CONFLICT(partner_id) WHERE closed_at IS NULL DO UPDATE SET birds=excluded.birds,funding_per_bird=excluded.funding_per_bird,cycle_name=excluded.cycle_name
  WHERE (batch_bird_allocations.birds,batch_bird_allocations.funding_per_bird,batch_bird_allocations.cycle_name) IS DISTINCT FROM (excluded.birds,excluded.funding_per_bird,excluded.cycle_name);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER track_bird_allocation AFTER INSERT OR UPDATE ON public.farm_partners FOR EACH ROW EXECUTE FUNCTION public.track_bird_allocation();
REVOKE ALL ON FUNCTION public.track_bird_allocation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_bird_allocation() TO service_role;
-- Old deployed clients must refresh rather than submitting manual ownership percentages.
CREATE FUNCTION public.allocate_batch_investors(batch_id_input uuid,allocations_input jsonb) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Allocation has been upgraded. Refresh and use Allocate Partners to enter birds or investment'; END $$;
REVOKE ALL ON FUNCTION public.allocate_batch_investors(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_batch_investors(uuid,jsonb) TO service_role;
INSERT INTO public.app_settings(key,value) VALUES('financial_visibility_staff','false'),('financial_visibility_manager','false') ON CONFLICT(key) DO NOTHING;
-- Partner-safe whole-batch sales quantities, without source IDs or customer information.
CREATE FUNCTION public.partner_batch_sales(batch_input uuid) RETURNS TABLE(sale_date date,birds numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT sale_day,sum(qty) FROM (
  SELECT transaction_date AS sale_day,birds_sold::numeric AS qty FROM farm_financials WHERE batch_id=batch_input AND type='income' AND approval_status='approved' AND birds_sold>0
  UNION ALL SELECT transaction_date,quantity FROM contact_transactions WHERE batch_id=batch_input AND NOT sync_to_farm AND transaction_type='sale_to_contact' AND approval_status='approved' AND (coalesce(unit,'')||' '||item_description) ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND (coalesce(unit,'')||' '||item_description) !~* '(egg|crate|manure)'
  UNION ALL SELECT (o.created_at AT TIME ZONE 'Africa/Lagos')::date,(item->>'qty')::numeric FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.items::jsonb) item WHERE o.batch_id=batch_input AND o.status='delivered' AND item->>'product' ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND item->>'product' !~* '(egg|crate|manure)'
  UNION ALL SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date,quantity FROM preorders WHERE batch_id=batch_input AND delivery_status='delivered' AND product ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND product !~* '(egg|crate|manure)'
 ) sales GROUP BY sale_day ORDER BY sale_day DESC;
$$;
REVOKE ALL ON FUNCTION public.partner_batch_sales(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.partner_batch_sales(uuid) TO service_role;

CREATE FUNCTION public.confirm_historical_birds(batch_input uuid,partner_input uuid,birds_input integer,revision_input integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.farm_batches; p public.farm_partners; BEGIN
 SELECT * INTO b FROM public.farm_batches WHERE id=batch_input FOR UPDATE;
 IF NOT FOUND OR b.allocation_revision<>revision_input THEN RAISE EXCEPTION 'Batch allocations changed. Reload and review'; END IF;
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_input FOR UPDATE;
 IF NOT FOUND OR p.batch_id<>b.id OR (p.active AND p.cycle_status='open') OR p.initial_investment<=0 OR p.allocated_birds IS NOT NULL THEN RAISE EXCEPTION 'Choose an unresolved inactive or closed historical allocation'; END IF;
 IF EXISTS(SELECT 1 FROM public.batch_bird_allocations WHERE partner_id=p.id AND batch_id=b.id AND cycle_name=p.cycle_name) THEN RAISE EXCEPTION 'Historical allocation already confirmed'; END IF;
 IF birds_input IS NULL OR birds_input<1 OR birds_input+coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE batch_id=b.id),0)>b.initial_headcount THEN RAISE EXCEPTION 'Historical birds exceed available batch capacity'; END IF;
 INSERT INTO public.batch_bird_allocations(partner_id,batch_id,cycle_name,birds,funding_per_bird,closed_at) VALUES(p.id,b.id,p.cycle_name,birds_input,round(p.initial_investment/birds_input,2),now());
 UPDATE public.farm_batches SET allocation_revision=allocation_revision+1 WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.confirm_historical_birds(uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_historical_birds(uuid,uuid,integer,integer) TO service_role;
