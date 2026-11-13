-- Default Supabase grants must not turn the audit log into editable application data.
REVOKE ALL ON public.record_audit_events FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.record_audit_events FROM service_role;
GRANT SELECT, INSERT ON public.record_audit_events TO service_role;
CREATE FUNCTION public.reject_audit_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit history is append-only'; END $$;
CREATE TRIGGER reject_audit_rewrite BEFORE UPDATE OR DELETE ON public.record_audit_events FOR EACH ROW EXECUTE FUNCTION public.reject_audit_rewrite();
CREATE TRIGGER reject_audit_truncate BEFORE TRUNCATE ON public.record_audit_events FOR EACH STATEMENT EXECUTE FUNCTION public.reject_audit_rewrite();
REVOKE ALL ON FUNCTION public.reject_audit_rewrite() FROM PUBLIC;
