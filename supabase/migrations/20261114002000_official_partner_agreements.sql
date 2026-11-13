CREATE TABLE public.official_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partner_id uuid NOT NULL REFERENCES public.farm_partners(id) ON DELETE RESTRICT,
 cycle_name text NOT NULL,template_version text NOT NULL,snapshot jsonb NOT NULL,content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','issued','partner_signed','witness_signed','completed','superseded')),
 created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 witness_token_hash text UNIQUE,witness_expires_at timestamptz,
 CHECK ((witness_token_hash IS NULL)=(witness_expires_at IS NULL)),
 pdf_path text UNIQUE,pdf_hash text CHECK(pdf_hash IS NULL OR pdf_hash ~ '^[a-f0-9]{64}$'),completed_at timestamptz,
 CHECK ((status='completed')=(pdf_hash IS NOT NULL AND pdf_path IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX official_agreement_partner ON public.official_agreements(partner_id,created_at DESC);
CREATE TABLE public.official_agreement_signatures (
 agreement_id uuid NOT NULL REFERENCES public.official_agreements(id) ON DELETE RESTRICT,
 signer_role text NOT NULL CHECK(signer_role IN('company','partner','witness')),
 legal_name text NOT NULL,signature_png text NOT NULL,consent text NOT NULL,content_hash text NOT NULL,
 signed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(agreement_id,signer_role)
);
ALTER TABLE public.official_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_agreement_signatures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.official_agreements,public.official_agreement_signatures FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.official_agreements TO service_role;
GRANT SELECT,INSERT ON public.official_agreement_signatures TO service_role;
CREATE POLICY agreement_server ON public.official_agreements FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY signature_server ON public.official_agreement_signatures FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE FUNCTION public.protect_official_agreement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Agreement versions are retained permanently'; END IF;
 IF NEW.id<>OLD.id OR NEW.partner_id<>OLD.partner_id OR NEW.snapshot<>OLD.snapshot OR NEW.content_hash<>OLD.content_hash OR NEW.template_version<>OLD.template_version OR NEW.cycle_name<>OLD.cycle_name OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Create a new agreement version to change terms'; END IF;
 IF OLD.pdf_hash IS NOT NULL AND (NEW.pdf_hash IS DISTINCT FROM OLD.pdf_hash OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path OR NEW.completed_at IS DISTINCT FROM OLD.completed_at) THEN RAISE EXCEPTION 'The official signed PDF is immutable'; END IF;
 IF NEW.status<>OLD.status AND NOT ((OLD.status='draft' AND NEW.status IN('issued','superseded')) OR (OLD.status='issued' AND NEW.status IN('partner_signed','superseded')) OR (OLD.status='partner_signed' AND NEW.status IN('witness_signed','superseded')) OR (OLD.status='witness_signed' AND NEW.status='completed')) THEN RAISE EXCEPTION 'Invalid agreement transition'; END IF;
 IF NEW.status IN('issued','partner_signed','witness_signed','completed') THEN
  IF NOT EXISTS(SELECT 1 FROM public.official_agreement_signatures WHERE agreement_id=NEW.id AND signer_role='company' AND content_hash=NEW.content_hash) THEN RAISE EXCEPTION 'Company signature required'; END IF;
  IF NEW.status IN('partner_signed','witness_signed','completed') AND NOT EXISTS(SELECT 1 FROM public.official_agreement_signatures WHERE agreement_id=NEW.id AND signer_role='partner' AND content_hash=NEW.content_hash) THEN RAISE EXCEPTION 'Partner signature required'; END IF;
  IF NEW.status IN('witness_signed','completed') AND NOT EXISTS(SELECT 1 FROM public.official_agreement_signatures WHERE agreement_id=NEW.id AND signer_role='witness' AND content_hash=NEW.content_hash) THEN RAISE EXCEPTION 'Witness signature required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_official_agreement BEFORE UPDATE OR DELETE ON public.official_agreements FOR EACH ROW EXECUTE FUNCTION public.protect_official_agreement();
CREATE TRIGGER immutable_official_signature BEFORE UPDATE OR DELETE ON public.official_agreement_signatures FOR EACH ROW EXECUTE FUNCTION public.reject_audit_rewrite();
CREATE TRIGGER official_agreement_audit AFTER INSERT OR UPDATE OR DELETE ON public.official_agreements FOR EACH ROW EXECUTE FUNCTION public.capture_record_audit();
CREATE FUNCTION public.sign_official_agreement(agreement_input uuid,role_input text,name_input text,png_input text,hash_input text,consent_input text,witness_hash_input text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.official_agreements; expected text; BEGIN
 -- Serialize replacements and signatures for this partner without reversing lock order.
 PERFORM id FROM public.farm_partners WHERE id=(SELECT partner_id FROM public.official_agreements WHERE id=agreement_input) FOR UPDATE;
 SELECT * INTO a FROM public.official_agreements WHERE id=agreement_input FOR UPDATE;
 IF NOT FOUND OR a.content_hash<>hash_input THEN RAISE EXCEPTION 'Agreement changed or unavailable. Review the current version'; END IF;
 IF role_input IN('company','partner') AND NOT EXISTS(SELECT 1 FROM public.farm_partners p WHERE p.id=a.partner_id AND p.cycle_name=a.cycle_name AND p.cycle_status='open' AND p.active) THEN RAISE EXCEPTION 'This cycle is closed or has been replaced; request a new agreement'; END IF;
 IF role_input='witness' AND (a.witness_token_hash IS DISTINCT FROM witness_hash_input OR a.witness_expires_at IS NULL OR a.witness_expires_at<=now()) THEN RAISE EXCEPTION 'Witness link expired, revoked or already used'; END IF;
 IF role_input='company' AND a.status='draft' THEN expected:=a.snapshot->'deal'->>'representative';
 ELSIF role_input='partner' AND a.status='issued' THEN expected:=a.snapshot->>'partnerName';
 ELSIF role_input='witness' AND a.status='partner_signed' THEN expected:=a.snapshot->'deal'->>'witnessName';
 ELSE RAISE EXCEPTION 'This signing step is unavailable or already completed'; END IF;
 IF lower(trim(name_input))<>lower(trim(expected)) OR length(consent_input)<10 THEN RAISE EXCEPTION 'The signer must match the named party and consent to these terms'; END IF;
 IF role_input='company' THEN
  UPDATE public.official_agreements SET status='superseded',witness_token_hash=NULL,witness_expires_at=NULL
    WHERE partner_id=a.partner_id AND cycle_name=a.cycle_name AND id<>a.id AND status IN('draft','issued','partner_signed');
 END IF;
 INSERT INTO public.official_agreement_signatures(agreement_id,signer_role,legal_name,signature_png,consent,content_hash) VALUES(a.id,role_input,name_input,png_input,consent_input,a.content_hash);
 UPDATE public.official_agreements SET status=CASE role_input WHEN 'company' THEN 'issued' WHEN 'partner' THEN 'partner_signed' ELSE 'witness_signed' END,
 witness_token_hash=CASE WHEN role_input='witness' THEN NULL ELSE witness_token_hash END,
 witness_expires_at=CASE WHEN role_input='witness' THEN NULL ELSE witness_expires_at END WHERE id=a.id;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('official-agreements','official-agreements',false,10485760,ARRAY['application/pdf']) ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=ARRAY['application/pdf'];
-- Restrictive guard also defeats unrelated permissive storage policies.
DO $$ BEGIN IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass) THEN RAISE EXCEPTION 'Storage row security must be enabled before installing agreements'; END IF; END $$;
CREATE POLICY official_agreement_private_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING(bucket_id <> 'official-agreements') WITH CHECK(bucket_id <> 'official-agreements');
DO $$ DECLARE signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY['protect_official_agreement()','sign_official_agreement(uuid,text,text,text,text,text,text)'] LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION public.'||signature||' FROM PUBLIC,anon,authenticated';
 EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||signature||' TO service_role';
 END LOOP;
END $$;
