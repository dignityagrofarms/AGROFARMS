CREATE FUNCTION public.lock_operational_batch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_batch uuid; new_batch uuid; BEGIN
 IF TG_OP<>'INSERT' THEN old_batch:=OLD.batch_id; END IF;
 IF TG_OP<>'DELETE' THEN new_batch:=NEW.batch_id; END IF;
 PERFORM id FROM public.farm_batches WHERE id IN(old_batch,new_batch) ORDER BY id FOR UPDATE;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE FUNCTION public.validate_physical_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_batch uuid; new_batch uuid; BEGIN
 IF TG_OP<>'INSERT' THEN old_batch:=OLD.batch_id; END IF;
 IF TG_OP<>'DELETE' THEN new_batch:=NEW.batch_id; END IF;
 IF TG_OP<>'DELETE' AND NEW.batch_id IS NULL THEN
  IF TG_TABLE_NAME='orders' THEN
   IF NEW.status='delivered' AND EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items::jsonb) i WHERE i->>'product' ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND i->>'product' !~* '(egg|crate|manure)') THEN RAISE EXCEPTION 'Assign bird orders to a batch before fulfillment'; END IF;
  ELSIF TG_TABLE_NAME='preorders' THEN
   IF NEW.delivery_status='delivered' AND NEW.product ~* '(bird|broiler|chicken|hen|layer|cockerel)' AND NEW.product !~* '(egg|crate|manure)' THEN RAISE EXCEPTION 'Assign bird preorders to a batch before fulfillment'; END IF;
  END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.batch_stock_summary(ARRAY[old_batch,new_batch]) WHERE live_birds<0) THEN
  RAISE EXCEPTION 'Insufficient physical birds: review the sale quantity, fulfilled orders, mortality or stock adjustments';
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['farm_financials','farm_activities','contact_transactions','orders','preorders','batch_stock_adjustments'] LOOP
  EXECUTE format('CREATE TRIGGER lock_batch_stock BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lock_operational_batch()',tbl);
  EXECUTE format('CREATE TRIGGER validate_batch_stock AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_physical_stock()',tbl);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.lock_operational_batch() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_physical_stock() FROM PUBLIC;
