CREATE FUNCTION public.preserve_submitter_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  NEW.recorded_by:=OLD.recorded_by;
  NEW.recorded_by_name:=OLD.recorded_by_name;
  NEW.recorded_by_role:=OLD.recorded_by_role;
 ELSE
  SELECT coalesce(nullif(full_name,''),username),role INTO NEW.recorded_by_name,NEW.recorded_by_role
    FROM public.admin_access WHERE username=NEW.recorded_by;
  NEW.recorded_by_name:=coalesce(NEW.recorded_by_name,NEW.recorded_by,'Unknown legacy submitter');
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['farm_financials','farm_activities','contact_transactions','farm_financial_payments'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN recorded_by_name text, ADD COLUMN recorded_by_role text',tbl);
  EXECUTE format('CREATE TRIGGER preserve_submitter BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.preserve_submitter_identity()',tbl);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.preserve_submitter_identity() FROM PUBLIC;

CREATE FUNCTION public.allocate_batch_investors(batch_id_input uuid, allocations_input jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE entry jsonb; p uuid; total numeric; BEGIN
 PERFORM 1 FROM public.farm_batches WHERE id=batch_id_input FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
 IF jsonb_array_length(allocations_input)<>(SELECT count(DISTINCT x->>'partnerId') FROM jsonb_array_elements(allocations_input)x) THEN RAISE EXCEPTION 'Duplicate investor'; END IF;
 FOR entry IN SELECT * FROM jsonb_array_elements(allocations_input) LOOP
  UPDATE public.farm_partners SET batch_id=batch_id_input,initial_investment=(entry->>'initialInvestment')::numeric,
    profit_share_percentage=(entry->>'profitSharePercentage')::numeric,loss_share_percentage=(entry->>'lossSharePercentage')::numeric,
    batch_allocation_percentage=(entry->>'batchAllocationPercentage')::numeric,auto_sync_batch=(entry->>'autoSyncBatch')::boolean,updated_at=now()
  WHERE id=(entry->>'partnerId')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Investor not found'; END IF;
 END LOOP;
 SELECT sum(profit_share_percentage) INTO total FROM public.farm_partners WHERE batch_id=batch_id_input;
 IF total>100 THEN RAISE EXCEPTION 'Final investor profit shares exceed 100%%'; END IF;
 FOR p IN SELECT id FROM public.farm_partners WHERE batch_id=batch_id_input AND auto_sync_batch ORDER BY id LOOP
  PERFORM public.reconcile_partner_batch(p);
  PERFORM public.reconcile_partner_commerce(p);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.allocate_batch_investors(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_batch_investors(uuid,jsonb) TO service_role;
