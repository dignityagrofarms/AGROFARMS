ALTER TABLE public.farm_partners ADD COLUMN allocation_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.batch_bird_allocations ADD COLUMN voided_at timestamptz, ADD COLUMN void_reason text, ADD CONSTRAINT voided_allocation_closed CHECK(voided_at IS NULL OR closed_at IS NOT NULL);
CREATE TABLE public.partner_allocation_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partner_id uuid NOT NULL REFERENCES public.farm_partners(id) ON DELETE RESTRICT,
 source_event_id bigint UNIQUE NOT NULL REFERENCES public.record_audit_events(id),cycle_name text NOT NULL,
 before_fields jsonb NOT NULL,after_fields jsonb NOT NULL,before_financials jsonb NOT NULL,before_activities jsonb NOT NULL,
 snapshot_complete boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),undone_at timestamptz,undone_by text,undo_reason text
);
CREATE INDEX partner_allocation_change_latest ON public.partner_allocation_changes(partner_id,source_event_id DESC);
ALTER TABLE public.partner_allocation_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_allocation_changes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.partner_allocation_changes TO service_role;
CREATE POLICY allocation_change_server ON public.partner_allocation_changes FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE FUNCTION public.allocation_fields(row_input jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT jsonb_build_object('batch_id',row_input->'batch_id','allocated_birds',row_input->'allocated_birds','initial_investment',row_input->'initial_investment','batch_allocation_percentage',row_input->'batch_allocation_percentage','profit_share_percentage',row_input->'profit_share_percentage','loss_share_percentage',row_input->'loss_share_percentage','auto_sync_batch',row_input->'auto_sync_batch');
$$;
CREATE FUNCTION public.stamp_allocation_version() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF allocation_fields(to_jsonb(OLD))<>allocation_fields(to_jsonb(NEW)) OR OLD.cycle_name<>NEW.cycle_name OR OLD.cycle_status<>NEW.cycle_status THEN NEW.allocation_version:=OLD.allocation_version+1; ELSE NEW.allocation_version:=OLD.allocation_version;END IF;RETURN NEW;END $$;
CREATE TRIGGER a_stamp_allocation_version BEFORE UPDATE ON public.farm_partners FOR EACH ROW EXECUTE FUNCTION public.stamp_allocation_version();
CREATE FUNCTION public.allocation_prior_rows(partner_input uuid,event_input bigint,table_input text) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(row_data),'[]') FROM (
  SELECT DISTINCT ON(source_id) after_data row_data FROM public.record_audit_events WHERE source_table=table_input AND id<event_input AND coalesce(after_data->>'partner_id',before_data->>'partner_id')=partner_input::text ORDER BY source_id,id DESC
 ) snapshots WHERE row_data->>'removed_at' IS NULL AND (row_data->>'source_financial_id' IS NOT NULL OR row_data->>'source_order_id' IS NOT NULL OR row_data->>'source_preorder_id' IS NOT NULL OR row_data->>'source_activity_id' IS NOT NULL);
$$;
-- Existing assignments are recoverable from the immutable audit; no partner values are changed.
INSERT INTO public.partner_allocation_changes(partner_id,source_event_id,cycle_name,before_fields,after_fields,before_financials,before_activities,created_at,snapshot_complete)
SELECT e.source_id,e.id,e.after_data->>'cycle_name',allocation_fields(e.before_data),allocation_fields(e.after_data),allocation_prior_rows(e.source_id,e.id,'partner_financials'),allocation_prior_rows(e.source_id,e.id,'partner_activities'),e.created_at,
 NOT EXISTS(SELECT 1 FROM public.partner_financials f WHERE f.partner_id=e.source_id AND f.created_at<e.created_at AND (f.source_financial_id IS NOT NULL OR f.source_order_id IS NOT NULL OR f.source_preorder_id IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM public.record_audit_events a WHERE a.source_table='partner_financials' AND a.source_id=f.id AND a.id<e.id))
 AND NOT EXISTS(SELECT 1 FROM public.partner_activities f WHERE f.partner_id=e.source_id AND f.created_at<e.created_at AND f.source_activity_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.record_audit_events a WHERE a.source_table='partner_activities' AND a.source_id=f.id AND a.id<e.id))
FROM public.record_audit_events e WHERE EXISTS(SELECT 1 FROM public.farm_partners p WHERE p.id=e.source_id) AND e.source_table='farm_partners' AND e.before_data IS NOT NULL AND e.after_data IS NOT NULL AND e.before_data->>'cycle_name'=e.after_data->>'cycle_name'
AND (e.before_data->>'batch_id' IS NOT NULL OR e.after_data->>'batch_id' IS NOT NULL) AND allocation_fields(e.before_data)<>allocation_fields(e.after_data);
CREATE FUNCTION public.capture_allocation_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE event_id bigint; BEGIN
 IF coalesce(current_setting('daf.undo_change',true),'')<>'' OR OLD.cycle_name<>NEW.cycle_name OR allocation_fields(to_jsonb(OLD))=allocation_fields(to_jsonb(NEW)) OR (OLD.batch_id IS NULL AND NEW.batch_id IS NULL) THEN RETURN NEW;END IF;
 SELECT max(id) INTO event_id FROM public.record_audit_events WHERE source_table='farm_partners' AND source_id=NEW.id;
 INSERT INTO public.partner_allocation_changes(partner_id,source_event_id,cycle_name,before_fields,after_fields,before_financials,before_activities)
 VALUES(NEW.id,event_id,NEW.cycle_name,allocation_fields(to_jsonb(OLD)),allocation_fields(to_jsonb(NEW)),
 (SELECT coalesce(jsonb_agg(to_jsonb(f)),'[]') FROM public.partner_financials f WHERE partner_id=NEW.id AND removed_at IS NULL AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL)),
 (SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') FROM public.partner_activities a WHERE partner_id=NEW.id AND removed_at IS NULL AND source_activity_id IS NOT NULL));
 RETURN NEW;
END $$;
CREATE TRIGGER zz_capture_allocation_change AFTER UPDATE ON public.farm_partners FOR EACH ROW EXECUTE FUNCTION public.capture_allocation_change();
CREATE FUNCTION public.protect_allocation_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['undone_at','undone_by','undo_reason'])<>(to_jsonb(OLD)-ARRAY['undone_at','undone_by','undo_reason']) OR OLD.undone_at IS NOT NULL THEN RAISE EXCEPTION 'Allocation change history is immutable';END IF;RETURN NEW;END $$;
CREATE TRIGGER protect_allocation_change BEFORE UPDATE OR DELETE ON public.partner_allocation_changes FOR EACH ROW EXECUTE FUNCTION public.protect_allocation_change();
CREATE TRIGGER audit_allocation_undo AFTER UPDATE ON public.partner_allocation_changes FOR EACH ROW EXECUTE FUNCTION public.capture_record_audit();

CREATE OR REPLACE FUNCTION public.allocate_batch_investors(batch_id_input uuid,funding_input numeric,allocations_input jsonb,revision_input integer)
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
 IF EXISTS(SELECT 1 FROM public.farm_partners WHERE batch_id=b.id AND NOT(id=ANY(ids)) AND allocated_birds IS NULL AND initial_investment>0 AND NOT EXISTS(SELECT 1 FROM public.batch_bird_allocations h WHERE h.voided_at IS NULL AND h.partner_id=farm_partners.id AND h.batch_id=b.id AND h.cycle_name=farm_partners.cycle_name)) THEN RAISE EXCEPTION 'An inactive or closed legacy allocation needs owner reconciliation before allocating this batch'; END IF;
 total:=total+coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE voided_at IS NULL AND batch_id=b.id AND (closed_at IS NOT NULL OR NOT(partner_id=ANY(ids)))),0);
 IF total>b.initial_headcount THEN RAISE EXCEPTION 'Allocated birds exceed initial batch capacity'; END IF;
 IF EXISTS(SELECT 1 FROM public.batch_bird_allocations WHERE voided_at IS NULL AND batch_id=b.id AND (closed_at IS NOT NULL OR NOT(partner_id=ANY(ids)))) AND b.funding_per_bird IS NOT NULL AND b.funding_per_bird IS DISTINCT FROM funding_input THEN RAISE EXCEPTION 'Funding is locked because this batch contains a closed partner cycle'; END IF;
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

CREATE OR REPLACE FUNCTION public.protect_batch_funding() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.initial_headcount<>OLD.initial_headcount AND EXISTS(SELECT 1 FROM public.batch_bird_allocations WHERE voided_at IS NULL AND batch_id=OLD.id) THEN RAISE EXCEPTION 'Initial headcount is locked after ownership allocation; record a stock adjustment instead'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.track_bird_allocation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_cycle text; BEGIN
 IF TG_OP='UPDATE' THEN
  old_cycle:=OLD.cycle_name;
  IF NEW.allocated_birds IS NULL OR NEW.cycle_status='closed' OR NEW.batch_id IS DISTINCT FROM OLD.batch_id OR (OLD.cycle_status='closed' AND NEW.cycle_name<>OLD.cycle_name) THEN
   UPDATE public.batch_bird_allocations SET closed_at=now() WHERE partner_id=NEW.id AND closed_at IS NULL;
  END IF;
  IF OLD.cycle_status='closed' AND NEW.cycle_status='open' AND NEW.cycle_name=OLD.cycle_name AND NEW.batch_id=OLD.batch_id AND NEW.allocated_birds IS NOT NULL THEN
   UPDATE public.batch_bird_allocations SET closed_at=NULL WHERE id=(SELECT id FROM public.batch_bird_allocations WHERE voided_at IS NULL AND partner_id=NEW.id AND batch_id=NEW.batch_id AND cycle_name=NEW.cycle_name ORDER BY created_at DESC LIMIT 1);
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

CREATE OR REPLACE FUNCTION public.confirm_historical_birds(batch_input uuid,partner_input uuid,birds_input integer,revision_input integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.farm_batches; p public.farm_partners; BEGIN
 SELECT * INTO b FROM public.farm_batches WHERE id=batch_input FOR UPDATE;
 IF NOT FOUND OR b.allocation_revision<>revision_input THEN RAISE EXCEPTION 'Batch allocations changed. Reload and review'; END IF;
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_input FOR UPDATE;
 IF NOT FOUND OR p.batch_id<>b.id OR (p.active AND p.cycle_status='open') OR p.initial_investment<=0 OR p.allocated_birds IS NOT NULL THEN RAISE EXCEPTION 'Choose an unresolved inactive or closed historical allocation'; END IF;
 IF EXISTS(SELECT 1 FROM public.batch_bird_allocations WHERE voided_at IS NULL AND partner_id=p.id AND batch_id=b.id AND cycle_name=p.cycle_name) THEN RAISE EXCEPTION 'Historical allocation already confirmed'; END IF;
 IF birds_input IS NULL OR birds_input<1 OR birds_input+coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE voided_at IS NULL AND batch_id=b.id),0)>b.initial_headcount THEN RAISE EXCEPTION 'Historical birds exceed available batch capacity'; END IF;
 INSERT INTO public.batch_bird_allocations(partner_id,batch_id,cycle_name,birds,funding_per_bird,closed_at) VALUES(p.id,b.id,p.cycle_name,birds_input,round(p.initial_investment/birds_input,2),now());
 UPDATE public.farm_batches SET allocation_revision=allocation_revision+1 WHERE id=b.id;
END $$;

CREATE FUNCTION public.partner_undo_preview(partner_input uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.farm_partners; c public.partner_allocation_changes; why text; previous_batch public.farm_batches; current_batch public.farm_batches; previous_birds integer; BEGIN
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_input;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found';END IF;
 SELECT * INTO c FROM public.partner_allocation_changes WHERE partner_id=p.id AND cycle_name=p.cycle_name ORDER BY source_event_id DESC LIMIT 1;
 IF c.id IS NULL THEN why:='Previous allocation details were not recorded. Review this assignment manually.';
 ELSIF c.undone_at IS NOT NULL THEN why:='The last allocation change has already been undone.';
 ELSIF NOT c.snapshot_complete THEN why:='Previous linked records cannot be recovered reliably. Review this assignment manually.';
 ELSIF NOT p.active OR p.cycle_status='closed' OR p.settled_at IS NOT NULL OR p.settlement_snapshot IS NOT NULL OR EXISTS(SELECT 1 FROM public.record_audit_events e WHERE e.source_table='farm_partners' AND e.source_id=p.id AND e.after_data->>'cycle_name'=p.cycle_name AND (e.after_data->>'cycle_status'='closed' OR e.after_data->>'settled_at' IS NOT NULL)) THEN why:='Closed or settled cycles cannot be undone.';
 ELSIF allocation_fields(to_jsonb(p))<>c.after_fields THEN why:='The allocation changed. Reload the partner workspace before undoing.';
 ELSIF p.agreement_signed OR EXISTS(SELECT 1 FROM public.record_audit_events e WHERE e.source_table='farm_partners' AND e.source_id=p.id AND e.after_data->>'cycle_name'=p.cycle_name AND e.after_data->>'agreement_signed'='true') OR EXISTS(SELECT 1 FROM public.official_agreements a JOIN public.official_agreement_signatures s ON s.agreement_id=a.id WHERE a.partner_id=p.id AND a.cycle_name=p.cycle_name) THEN why:='An agreement has already been signed for this cycle. Undo is blocked.';
 ELSIF EXISTS(SELECT 1 FROM public.partner_financials WHERE partner_id=p.id AND type='payout' AND coalesce(cycle_name,p.cycle_name)=p.cycle_name) THEN why:='A payout has been recorded for this cycle. Undo is blocked.';
 END IF;
 SELECT * INTO current_batch FROM public.farm_batches WHERE id=p.batch_id;
 SELECT * INTO previous_batch FROM public.farm_batches WHERE id=(c.before_fields->>'batch_id')::uuid;
 previous_birds:=(c.before_fields->>'allocated_birds')::integer;
 IF why IS NULL AND (EXISTS(SELECT 1 FROM jsonb_array_elements(c.before_financials) x WHERE NOT EXISTS(SELECT 1 FROM public.partner_financials f WHERE f.id=(x->>'id')::uuid AND f.partner_id=p.id) OR (x->>'source_financial_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.farm_financials f WHERE f.id=(x->>'source_financial_id')::uuid)) OR (x->>'source_order_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.orders f WHERE f.id=(x->>'source_order_id')::uuid)) OR (x->>'source_preorder_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.preorders f WHERE f.id=(x->>'source_preorder_id')::uuid))) OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.before_activities) x WHERE NOT EXISTS(SELECT 1 FROM public.partner_activities a WHERE a.id=(x->>'id')::uuid AND a.partner_id=p.id) OR NOT EXISTS(SELECT 1 FROM public.farm_activities a WHERE a.id=(x->>'source_activity_id')::uuid))) THEN why:='Original source history changed and cannot be restored reliably. Review this assignment manually.';END IF;
 IF why IS NULL AND previous_birds IS NOT NULL THEN
  IF previous_batch.id IS NULL OR previous_batch.status<>'active' OR previous_batch.funding_per_bird*previous_birds<>(c.before_fields->>'initial_investment')::numeric THEN why:='Shared batch funding changed. Review allocations together before restoring this assignment.';
  ELSIF previous_birds+coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE batch_id=previous_batch.id AND partner_id<>p.id AND voided_at IS NULL),0)+coalesce((SELECT sum(birds) FROM public.batch_bird_allocations WHERE batch_id=previous_batch.id AND partner_id=p.id AND closed_at IS NOT NULL AND voided_at IS NULL),0)>previous_batch.initial_headcount THEN why:='Restoring the previous allocation would exceed batch capacity.';END IF;
 END IF;
 RETURN jsonb_build_object('canUndo',why IS NULL,'reason',why,'changeId',c.id,'partnerId',p.id,'partnerName',p.full_name,'cycleName',p.cycle_name,'allocationVersion',p.allocation_version,'batchRevision',current_batch.allocation_revision,'previousBatchRevision',previous_batch.allocation_revision,'current',allocation_fields(to_jsonb(p))||jsonb_build_object('batch_name',current_batch.batch_name),'previous',c.before_fields||jsonb_build_object('batch_name',previous_batch.batch_name),'linkedFinancialCount',(SELECT count(*) FROM public.partner_financials WHERE partner_id=p.id AND removed_at IS NULL AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL)),'linkedActivityCount',(SELECT count(*) FROM public.partner_activities WHERE partner_id=p.id AND removed_at IS NULL AND source_activity_id IS NOT NULL));
END $$;
CREATE FUNCTION public.undo_partner_allocation(partner_input uuid,change_input uuid,version_input bigint,batch_revision_input integer,previous_revision_input integer,reason_input text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.farm_partners; c public.partner_allocation_changes; preview jsonb; item jsonb; f public.partner_financials; a public.partner_activities; actor jsonb; BEGIN
 -- Batch locks precede partner locks, matching allocation saves.
 SELECT * INTO c FROM public.partner_allocation_changes WHERE id=change_input AND partner_id=partner_input;
 IF NOT FOUND THEN RAISE EXCEPTION 'Allocation change unavailable';END IF;
 PERFORM id FROM public.farm_batches WHERE id IN((c.before_fields->>'batch_id')::uuid,(c.after_fields->>'batch_id')::uuid) ORDER BY id FOR UPDATE;
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_input FOR UPDATE;
 preview:=public.partner_undo_preview(partner_input);
 IF NOT (preview->>'canUndo')::boolean THEN RAISE EXCEPTION '%',preview->>'reason';END IF;
 IF (preview->>'changeId')::uuid<>change_input OR p.allocation_version<>version_input OR (preview->>'batchRevision')::integer IS DISTINCT FROM batch_revision_input OR (preview->>'previousBatchRevision')::integer IS DISTINCT FROM previous_revision_input THEN RAISE EXCEPTION 'Allocation changed. Reload the undo preview and review it again';END IF;
 IF length(trim(reason_input))<3 OR length(reason_input)>500 THEN RAISE EXCEPTION 'Give a short reason for undoing this allocation';END IF;
 -- Preserve every source transaction and manually keyed partner record.
 UPDATE public.partner_financials SET removed_at=now(),removal_reason='Allocation undone: '||change_input WHERE partner_id=p.id AND removed_at IS NULL AND (source_financial_id IS NOT NULL OR source_order_id IS NOT NULL OR source_preorder_id IS NOT NULL);
 UPDATE public.partner_activities SET removed_at=now(),removal_reason='Allocation undone: '||change_input WHERE partner_id=p.id AND removed_at IS NULL AND source_activity_id IS NOT NULL;
 FOR item IN SELECT value FROM jsonb_array_elements(c.before_financials) LOOP
  f:=jsonb_populate_record(NULL::public.partner_financials,item);
  UPDATE public.partner_financials SET amount=f.amount,type=f.type,category=f.category,description=f.description,payment_method=f.payment_method,transaction_date=f.transaction_date,reference_no=f.reference_no,approval_status=f.approval_status,removed_at=NULL,removed_by=NULL,removal_reason=NULL WHERE id=f.id AND partner_id=p.id;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(c.before_activities) LOOP
  a:=jsonb_populate_record(NULL::public.partner_activities,item);
  UPDATE public.partner_activities SET activity_date=a.activity_date,activity_type=a.activity_type,stock_headcount=a.stock_headcount,mortality_count=a.mortality_count,feed_consumed_kg=a.feed_consumed_kg,average_weight_kg=a.average_weight_kg,notes=a.notes,removed_at=NULL,removed_by=NULL,removal_reason=NULL WHERE id=a.id AND partner_id=p.id;
 END LOOP;
 PERFORM set_config('daf.undo_change',change_input::text,true);
 IF (c.before_fields->>'batch_id')::uuid IS DISTINCT FROM p.batch_id OR c.before_fields->>'allocated_birds' IS NULL THEN
  UPDATE public.batch_bird_allocations SET closed_at=now(),voided_at=now(),void_reason=reason_input WHERE partner_id=p.id AND closed_at IS NULL AND voided_at IS NULL;
 END IF;
 UPDATE public.farm_partners SET batch_id=(c.before_fields->>'batch_id')::uuid,allocated_birds=(c.before_fields->>'allocated_birds')::integer,initial_investment=(c.before_fields->>'initial_investment')::numeric,batch_allocation_percentage=(c.before_fields->>'batch_allocation_percentage')::numeric,profit_share_percentage=(c.before_fields->>'profit_share_percentage')::numeric,loss_share_percentage=(c.before_fields->>'loss_share_percentage')::numeric,auto_sync_batch=(c.before_fields->>'auto_sync_batch')::boolean,updated_at=now() WHERE id=p.id;
 IF (c.before_fields->>'auto_sync_batch')::boolean AND c.before_fields->>'batch_id' IS NOT NULL THEN PERFORM public.reconcile_partner_batch(p.id);PERFORM public.reconcile_partner_commerce(p.id);END IF;
 UPDATE public.farm_batches SET allocation_revision=allocation_revision+1 WHERE id IN(p.batch_id,(c.before_fields->>'batch_id')::uuid);
 UPDATE public.official_agreements SET status='superseded' WHERE partner_id=p.id AND cycle_name=p.cycle_name AND status='draft' AND ((snapshot->'deal'->>'capital')::numeric IS DISTINCT FROM (c.before_fields->>'initial_investment')::numeric OR (snapshot->'deal'->>'partnerProfit')::numeric IS DISTINCT FROM (c.before_fields->>'profit_share_percentage')::numeric OR (c.before_fields->>'allocated_birds' IS NOT NULL AND (snapshot->'deal'->>'birds')::integer IS DISTINCT FROM (c.before_fields->>'allocated_birds')::integer));
 actor:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-daf-actor';
 UPDATE public.partner_allocation_changes SET undone_at=now(),undone_by=coalesce(actor->>'username','owner'),undo_reason=trim(reason_input) WHERE id=c.id;
 PERFORM set_config('daf.undo_change','',true);
END $$;
-- Payouts share the partner lock and require the version reviewed in the form.
CREATE FUNCTION public.record_partner_payout(partner_input uuid,version_input bigint,row_input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.farm_partners; net numeric; paid numeric; due numeric; amount_input numeric; result_id uuid; BEGIN
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_input FOR UPDATE;
 IF NOT FOUND OR p.allocation_version<>version_input THEN RAISE EXCEPTION 'Partner allocation changed. Reload before recording the payout';END IF;
 SELECT coalesce(sum(CASE type WHEN 'income' THEN amount WHEN 'expense' THEN -amount ELSE 0 END),0),coalesce(sum(CASE type WHEN 'payout' THEN amount ELSE 0 END),0) INTO net,paid FROM public.partner_financials WHERE partner_id=p.id AND removed_at IS NULL AND coalesce(approval_status,'approved')='approved';
 due:=greatest(0,p.initial_investment+CASE WHEN net>=0 THEN net*p.profit_share_percentage/100 ELSE -least(p.initial_investment,abs(net)*p.loss_share_percentage/100) END)-paid;
 amount_input:=(row_input->>'amount')::numeric;
 IF amount_input IS NULL OR amount_input<=0 OR amount_input>due+0.01 THEN RAISE EXCEPTION 'Payout exceeds the current balance owed';END IF;
 PERFORM set_config('daf.payout_guard',p.id::text,true);
 INSERT INTO public.partner_financials(partner_id,batch_id,type,category,amount,description,payment_method,transaction_date,reference_no,recorded_by,approval_status,approved_by,approved_at,receipt_url,attachment_name,cycle_name)
 VALUES(p.id,p.batch_id,'payout',row_input->>'category',amount_input,row_input->>'description',row_input->>'payment_method',(row_input->>'transaction_date')::date,row_input->>'reference_no',row_input->>'recorded_by','approved',row_input->>'recorded_by',now(),row_input->>'receipt_url',row_input->>'attachment_name',p.cycle_name) RETURNING id INTO result_id;
 PERFORM set_config('daf.payout_guard','',true);
 RETURN result_id;
END $$;
CREATE FUNCTION public.guard_partner_payout() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.type='payout' THEN
  PERFORM id FROM public.farm_partners WHERE id=NEW.partner_id FOR UPDATE;
  IF current_setting('daf.payout_guard',true) IS DISTINCT FROM NEW.partner_id::text THEN RAISE EXCEPTION 'Reload and record this payout through the partner payout form';END IF;
 END IF;RETURN NEW;END $$;
CREATE TRIGGER guard_partner_payout BEFORE INSERT ON public.partner_financials FOR EACH ROW EXECUTE FUNCTION public.guard_partner_payout();
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['allocation_fields(jsonb)','stamp_allocation_version()','allocation_prior_rows(uuid,bigint,text)','capture_allocation_change()','protect_allocation_change()','partner_undo_preview(uuid)','undo_partner_allocation(uuid,uuid,bigint,integer,integer,text)','record_partner_payout(uuid,bigint,jsonb)','guard_partner_payout()'] LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION public.'||name||' FROM PUBLIC,anon,authenticated';EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||name||' TO service_role';END LOOP;
END $$;
