-- Apply only after deploying server-authorized application flows.
DO $$ DECLARE tbl text; pol record; BEGIN
  FOREACH tbl IN ARRAY ARRAY['admin_access','app_settings','orders','preorders','preorder_payments','farm_batches','farm_financials','farm_activities','crm_leads','crm_lead_activities','customer_complaints','staff_tasks','special_contacts','contact_transactions','farm_partners','partner_financials','partner_activities','farm_financial_payments','push_subscriptions','staff_attendance','staff_documents','staff_leave_requests','staff_payment_receipts','staff_suspensions','discount_vouchers','newsletter_subscribers'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
    EXECUTE format('CREATE POLICY trusted_server ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.capture_record_audit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_contact_financial() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_financial_payment() FROM PUBLIC;
