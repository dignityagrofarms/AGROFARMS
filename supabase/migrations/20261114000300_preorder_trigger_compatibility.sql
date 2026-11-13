-- Some installations have a pre-repository payment total trigger. Keep exactly one handler.
DO $$ DECLARE existing_trigger record; BEGIN
 FOR existing_trigger IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.preorder_payments'::regclass
  AND tgfoid=to_regprocedure('public.recalculate_preorder_amount_paid()') AND NOT tgisinternal LOOP
  EXECUTE format('DROP TRIGGER %I ON public.preorder_payments',existing_trigger.tgname);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.apply_preorder_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE parent public.preorders; delta numeric:=0; next_paid numeric; next_status public.preorders.payment_status%TYPE; BEGIN
 IF TG_OP='UPDATE' AND (NEW.preorder_id<>OLD.preorder_id OR NEW.amount<>OLD.amount) THEN RAISE EXCEPTION 'Payment amount and preorder are immutable'; END IF;
 IF TG_OP<>'DELETE' AND NEW.confirmed_by_admin THEN delta:=NEW.amount; END IF;
 IF TG_OP<>'INSERT' AND OLD.confirmed_by_admin THEN delta:=delta-OLD.amount; END IF;
 SELECT * INTO parent FROM public.preorders WHERE id=coalesce(NEW.preorder_id,OLD.preorder_id) FOR UPDATE;
 IF NOT FOUND OR delta=0 THEN RETURN coalesce(NEW,OLD); END IF;
 next_paid:=greatest(0,parent.amount_paid+delta);
 IF delta>0 AND next_paid>parent.total_amount THEN RAISE EXCEPTION 'Payment exceeds remaining preorder balance'; END IF;
 next_status:=CASE WHEN next_paid>=parent.total_amount THEN 'fully_paid' WHEN next_paid>0 THEN 'partially_paid' ELSE 'pending' END;
 UPDATE public.preorders SET amount_paid=next_paid,payment_status=next_status,updated_at=now() WHERE id=parent.id;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.apply_preorder_payment() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_preorder_payment() TO service_role;
