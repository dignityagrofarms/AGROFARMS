-- Storefront receipts enter partner ledgers directly; never duplicate farm ledger income.
ALTER TABLE public.partner_financials ADD COLUMN source_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
 ADD COLUMN source_preorder_id uuid REFERENCES public.preorders(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX partner_order_source ON public.partner_financials(partner_id,source_order_id) WHERE source_order_id IS NOT NULL AND removed_at IS NULL;
CREATE UNIQUE INDEX partner_preorder_source ON public.partner_financials(partner_id,source_preorder_id) WHERE source_preorder_id IS NOT NULL AND removed_at IS NULL;
CREATE FUNCTION public.reconcile_partner_commerce(partner_id_input uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.farm_partners; ratio numeric; BEGIN
 SELECT * INTO p FROM public.farm_partners WHERE id=partner_id_input FOR UPDATE;
 IF NOT FOUND OR p.batch_id IS NULL OR p.cycle_status='closed' THEN RETURN; END IF;
 ratio:=p.batch_allocation_percentage/100;
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
CREATE FUNCTION public.reconcile_changed_commerce() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE partner record; old_batch uuid; new_batch uuid; BEGIN
 IF TG_OP<>'INSERT' THEN old_batch:=OLD.batch_id; END IF;
 IF TG_OP<>'DELETE' THEN new_batch:=NEW.batch_id; END IF;
 FOR partner IN SELECT id FROM public.farm_partners WHERE batch_id IN(old_batch,new_batch) AND auto_sync_batch AND cycle_status<>'closed' ORDER BY id LOOP
  PERFORM public.reconcile_partner_commerce(partner.id);
 END LOOP;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER partner_commerce AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reconcile_changed_commerce();
CREATE TRIGGER partner_commerce AFTER INSERT OR UPDATE ON public.preorders FOR EACH ROW EXECUTE FUNCTION public.reconcile_changed_commerce();
REVOKE ALL ON FUNCTION public.reconcile_partner_commerce(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_changed_commerce() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_partner_commerce(uuid) TO service_role;
