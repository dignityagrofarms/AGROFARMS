-- Supabase default privileges may grant anon/authenticated EXECUTE directly.
-- Revoking PUBLIC alone does not remove those grants on SECURITY DEFINER RPCs.
DO $$ DECLARE signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY[
 'capture_record_audit()','sync_contact_financial()','apply_financial_payment()',
 'reconcile_partner_batch(uuid,numeric)','reconcile_changed_batch()','retire_partner_source()',
 'batch_stock_summary(uuid[])','close_batch_reconciled(uuid,text)','validate_feed_usage()',
 'preserve_submitter_identity()','allocate_batch_investors(uuid,jsonb)',
 'reconcile_partner_commerce(uuid)','reconcile_changed_commerce()','apply_preorder_payment()',
 'guard_financial_balance()','protect_contact_mirror()','reject_audit_rewrite()',
 'lock_operational_batch()','validate_physical_stock()'
 ] LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION public.'||signature||' FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||signature||' TO service_role';
 END LOOP;
END $$;
