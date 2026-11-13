-- Derive follow-up balances from the original receipt and approved payment rows.
-- Also keeps older deployed clients' redundant balance updates idempotent during rollout.
ALTER TABLE public.farm_financials ADD COLUMN initial_paid_amount numeric(12,2);
CREATE FUNCTION public.guard_financial_balance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('daf.applying_payment',true),'')<>'on' AND OLD.initial_paid_amount IS NOT NULL THEN
  NEW.initial_paid_amount:=OLD.initial_paid_amount;
  SELECT OLD.initial_paid_amount+coalesce(sum(amount),0) INTO NEW.amount_paid FROM public.farm_financial_payments WHERE financial_id=OLD.id AND approval_status='approved';
  IF NEW.amount_paid>NEW.amount THEN RAISE EXCEPTION 'Total cannot be below approved receipts; correct the payment records first'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER financial_balance_guard BEFORE UPDATE ON public.farm_financials FOR EACH ROW EXECUTE FUNCTION public.guard_financial_balance();
CREATE OR REPLACE FUNCTION public.apply_financial_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE parent public.farm_financials; delta numeric:=0; baseline numeric; previous_flag text; BEGIN
 IF TG_OP='UPDATE' AND (NEW.financial_id<>OLD.financial_id OR NEW.amount<>OLD.amount) THEN RAISE EXCEPTION 'Payment amount and parent are immutable; reverse and record a new payment'; END IF;
 IF TG_OP<>'DELETE' AND NEW.approval_status='approved' THEN delta:=NEW.amount; END IF;
 IF TG_OP<>'INSERT' AND OLD.approval_status='approved' THEN delta:=delta-OLD.amount; END IF;
 SELECT * INTO parent FROM public.farm_financials WHERE id=coalesce(NEW.financial_id,OLD.financial_id) FOR UPDATE;
 IF NOT FOUND OR delta=0 THEN RETURN coalesce(NEW,OLD); END IF;
 IF delta>0 AND parent.approval_status<>'approved' THEN RAISE EXCEPTION 'Approve the original transaction first'; END IF;
 IF coalesce(parent.amount_paid,parent.amount)+delta>parent.amount THEN RAISE EXCEPTION 'Payment exceeds remaining balance'; END IF;
 baseline:=parent.initial_paid_amount;
 IF baseline IS NULL THEN SELECT coalesce(parent.amount_paid,parent.amount)-coalesce(sum(amount),0) INTO baseline FROM public.farm_financial_payments WHERE financial_id=parent.id AND approval_status='approved'; END IF;
 previous_flag:=current_setting('daf.applying_payment',true);
 PERFORM set_config('daf.applying_payment','on',true);
 UPDATE public.farm_financials SET initial_paid_amount=baseline,amount_paid=greatest(0,coalesce(amount_paid,amount)+delta) WHERE id=parent.id;
 PERFORM set_config('daf.applying_payment',coalesce(previous_flag,''),true);
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.guard_financial_balance() FROM PUBLIC;
