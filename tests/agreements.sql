\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.headers='{"x-daf-actor":"{\"username\":\"test-owner\",\"role\":\"owner\"}"}';
CREATE FUNCTION pg_temp.must_fail(command text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN RETURN; END;
 RAISE EXCEPTION 'Unexpectedly allowed: %',command;
END $$;
DO $$
DECLARE p uuid; a uuid; replacement uuid; snap jsonb; h text:=repeat('a',64); token text:=repeat('b',64); n int;
BEGIN
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,cycle_name) VALUES('TEST Investor','08000000000','test-agreement-investor','not-a-login','Test cycle') RETURNING id INTO p;
 snap:='{"partnerName":"TEST Investor","deal":{"representative":"TEST Company","witnessName":"TEST Witness"}}';
 INSERT INTO official_agreements(partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES(p,'Test cycle','TEST',snap,h,'test-owner') RETURNING id INTO a;
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''partner'',''TEST Investor'',''test png'',%L,''Test explicit consent'')',a,h));
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''company'',''Wrong name'',''test png'',%L,''Test explicit consent'')',a,h));
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''company'',''TEST Company'',''test png'',%L,''Test explicit consent'')',a,repeat('c',64)));
 PERFORM sign_official_agreement(a,'company','TEST Company','test png',h,'Test explicit consent');
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''company'',''TEST Company'',''test png'',%L,''Test explicit consent'')',a,h));
 PERFORM sign_official_agreement(a,'partner','TEST Investor','test png',h,'Test explicit consent');
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''witness'',''TEST Witness'',''test png'',%L,''Test explicit consent'',NULL)',a,h));
 UPDATE official_agreements SET witness_token_hash=token,witness_expires_at=now()-interval '1 hour' WHERE id=a;
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''witness'',''TEST Witness'',''test png'',%L,''Test explicit consent'',%L)',a,h,token));
 UPDATE official_agreements SET witness_expires_at=now()+interval '1 hour' WHERE id=a;
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''witness'',''TEST Witness'',''test png'',%L,''Test explicit consent'',%L)',a,h,repeat('c',64)));
 PERFORM sign_official_agreement(a,'witness','TEST Witness','test png',h,'Test explicit consent',token);
 SELECT count(*) INTO n FROM official_agreement_signatures WHERE agreement_id=a;
 IF n<>3 OR NOT EXISTS(SELECT 1 FROM official_agreements WHERE id=a AND status='witness_signed' AND witness_token_hash IS NULL) THEN RAISE EXCEPTION 'Three-party lifecycle failed'; END IF;
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''witness'',''TEST Witness'',''test png'',%L,''Test explicit consent'',%L)',a,h,token));
 PERFORM pg_temp.must_fail(format('UPDATE official_agreements SET status=''completed'' WHERE id=%L',a));
 UPDATE official_agreements SET status='completed',pdf_hash=repeat('d',64),pdf_path='test/signed.pdf',completed_at=now() WHERE id=a;
 PERFORM pg_temp.must_fail(format('UPDATE official_agreements SET snapshot=''{}'' WHERE id=%L',a));
 PERFORM pg_temp.must_fail(format('UPDATE official_agreements SET completed_at=now()+interval ''1 day'' WHERE id=%L',a));
 PERFORM pg_temp.must_fail(format('UPDATE official_agreements SET pdf_hash=%L WHERE id=%L',h,a));
 PERFORM pg_temp.must_fail(format('DELETE FROM official_agreement_signatures WHERE agreement_id=%L',a));
 PERFORM pg_temp.must_fail(format('UPDATE official_agreement_signatures SET legal_name=''changed'' WHERE agreement_id=%L',a));
 PERFORM pg_temp.must_fail(format('DELETE FROM official_agreements WHERE id=%L',a));
 -- Replacement revokes incomplete versions; the completed original stays downloadable.
 INSERT INTO official_agreements(partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES(p,'Test cycle','TEST',snap,h,'test-owner') RETURNING id INTO a;
 PERFORM sign_official_agreement(a,'company','TEST Company','test png',h,'Test explicit consent');
 PERFORM sign_official_agreement(a,'partner','TEST Investor','test png',h,'Test explicit consent');
 UPDATE official_agreements SET witness_token_hash=token,witness_expires_at=now()+interval '1 hour' WHERE id=a;
 INSERT INTO official_agreements(partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES(p,'Test cycle','TEST',snap,h,'test-owner') RETURNING id INTO replacement;
 PERFORM sign_official_agreement(replacement,'company','TEST Company','test png',h,'Test explicit consent');
 IF NOT EXISTS(SELECT 1 FROM official_agreements WHERE id=a AND status='superseded' AND witness_token_hash IS NULL) OR NOT EXISTS(SELECT 1 FROM official_agreements WHERE partner_id=p AND status='completed') THEN RAISE EXCEPTION 'Replacement destroyed history'; END IF;
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''witness'',''TEST Witness'',''test png'',%L,''Test explicit consent'',%L)',a,h,token));
 UPDATE farm_partners SET cycle_status='closed' WHERE id=p;
 PERFORM pg_temp.must_fail(format('SELECT sign_official_agreement(%L,''partner'',''TEST Investor'',''test png'',%L,''Test explicit consent'')',replacement,h));
 IF NOT EXISTS(SELECT 1 FROM record_audit_events WHERE source_id=replacement) THEN RAISE EXCEPTION 'Agreement audit missing'; END IF;
 IF has_table_privilege('anon','official_agreements','SELECT') OR has_table_privilege('authenticated','official_agreement_signatures','INSERT') OR has_function_privilege('anon','sign_official_agreement(uuid,text,text,text,text,text,text)','EXECUTE') OR has_function_privilege('authenticated','sign_official_agreement(uuid,text,text,text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Public agreement access allowed'; END IF;
 IF has_table_privilege('service_role','official_agreements','DELETE') OR has_table_privilege('service_role','official_agreement_signatures','UPDATE') THEN RAISE EXCEPTION 'Service can rewrite signatures'; END IF;
END $$;
-- Even an unrelated permissive storage rule must not expose these private PDFs.
GRANT USAGE ON SCHEMA storage TO anon,authenticated;
GRANT SELECT,INSERT ON storage.objects TO anon,authenticated;
CREATE POLICY test_broad_storage ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
INSERT INTO storage.objects(id,bucket_id,name) VALUES(gen_random_uuid(),'official-agreements','private.pdf'),(gen_random_uuid(),'other-bucket','other.pdf');
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='official-agreements') THEN RAISE EXCEPTION 'Private PDF exposed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='other-bucket') THEN RAISE EXCEPTION 'Unrelated bucket blocked'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
