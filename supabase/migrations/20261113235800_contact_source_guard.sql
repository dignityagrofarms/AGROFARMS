-- Mirrors are changed exclusively by the canonical contact trigger / cascade.
CREATE FUNCTION public.protect_contact_mirror() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF pg_trigger_depth()=1 AND coalesce(NEW.source_contact_id,OLD.source_contact_id) IS NOT NULL THEN
  RAISE EXCEPTION 'Edit, review or delete the original contact transaction instead of its linked financial entry';
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_contact_source BEFORE INSERT OR UPDATE OR DELETE ON public.farm_financials FOR EACH ROW EXECUTE FUNCTION public.protect_contact_mirror();
REVOKE ALL ON FUNCTION public.protect_contact_mirror() FROM PUBLIC;
