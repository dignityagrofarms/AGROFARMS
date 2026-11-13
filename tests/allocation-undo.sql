\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.headers='{"x-daf-actor":"{\"username\":\"test-owner\",\"role\":\"owner\"}"}';
CREATE FUNCTION pg_temp.must_fail(command text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN BEGIN EXECUTE command;EXCEPTION WHEN OTHERS THEN RETURN;END;RAISE EXCEPTION 'Unexpectedly allowed: %',command;END $$;
CREATE FUNCTION pg_temp.undo(partner uuid) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v jsonb;BEGIN
 v:=public.partner_undo_preview(partner);
 IF NOT(v->>'canUndo')::boolean THEN RAISE EXCEPTION 'Not undoable: %',v->>'reason';END IF;
 PERFORM public.undo_partner_allocation(partner,(v->>'changeId')::uuid,(v->>'allocationVersion')::bigint,(v->>'batchRevision')::integer,(v->>'previousBatchRevision')::integer,'TEST mistaken assignment');
END $$;
DO $$
DECLARE b uuid;p uuid;f uuid;m uuid;v jsonb;first_version bigint;investment numeric;allocation jsonb;a uuid;matching_draft uuid;conflicting_draft uuid; BEGIN
 INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST undo pool','Broiler',200,200,current_date) RETURNING id INTO b;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,initial_investment,profit_share_percentage,loss_share_percentage,auto_sync_batch) VALUES('TEST undo investor','08000000000','test-undo-investor','not-a-login',123000,60,90,false) RETURNING id INTO p;
 IF (partner_undo_preview(p)->>'canUndo')::boolean THEN RAISE EXCEPTION 'Missing history was guessed';END IF;
 INSERT INTO partner_financials(partner_id,type,category,amount,description,payment_method,transaction_date,approval_status,cycle_name) VALUES(p,'income','Manual income',500,'TEST manual entry','Cash',current_date,'approved','Cycle 1') RETURNING id INTO m;
 INSERT INTO farm_financials(batch_id,type,category,amount,amount_paid,description,payment_method,transaction_date,approval_status,birds_sold) VALUES(b,'income','Bird Sales',100000,100000,'TEST actual farm sale','Cash',current_date,'approved',10) RETURNING id INTO f;
 allocation:=jsonb_build_array(jsonb_build_object('partnerId',p,'birds',50,'profitSharePercentage',70,'lossSharePercentage',100));
 INSERT INTO official_agreements(partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES(p,'Cycle 1','TEST','{"deal":{"capital":123000,"partnerProfit":60,"birds":50}}',repeat('c',64),'test-owner') RETURNING id INTO matching_draft;
 INSERT INTO official_agreements(partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES(p,'Cycle 1','TEST','{"deal":{"capital":350000,"partnerProfit":70,"birds":50}}',repeat('d',64),'test-owner') RETURNING id INTO conflicting_draft;
 PERFORM allocate_batch_investors(b,7000,allocation,0);
 v:=partner_undo_preview(p);IF NOT(v->>'canUndo')::boolean OR (v->'previous'->>'initial_investment')::numeric<>123000 THEN RAISE EXCEPTION 'Before state not captured: %',v;END IF;
 first_version:=(v->>'allocationVersion')::bigint;
 UPDATE farm_partners SET full_name='TEST updated contact details' WHERE id=p;
 PERFORM pg_temp.undo(p);
 IF (SELECT status FROM official_agreements WHERE id=matching_draft)<>'draft' OR (SELECT status FROM official_agreements WHERE id=conflicting_draft)<>'superseded' THEN RAISE EXCEPTION 'Draft compatibility was not preserved';END IF;
 IF NOT EXISTS(SELECT 1 FROM farm_partners WHERE id=p AND batch_id IS NULL AND allocated_birds IS NULL AND initial_investment=123000 AND profit_share_percentage=60 AND loss_share_percentage=90 AND NOT auto_sync_batch AND full_name='TEST updated contact details') THEN RAISE EXCEPTION 'Original details or unrelated edits were lost';END IF;
 IF EXISTS(SELECT 1 FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL) THEN RAISE EXCEPTION 'Wrong synchronized sale still active';END IF;
 IF NOT EXISTS(SELECT 1 FROM partner_financials WHERE id=m AND amount=500 AND removed_at IS NULL) OR NOT EXISTS(SELECT 1 FROM farm_financials WHERE id=f AND amount=100000 AND approval_status='approved') THEN RAISE EXCEPTION 'Manual entry or original farm record changed';END IF;
 IF NOT EXISTS(SELECT 1 FROM batch_bird_allocations WHERE partner_id=p AND voided_at IS NOT NULL) THEN RAISE EXCEPTION 'Undo history not retained';END IF;
 IF (partner_undo_preview(p)->>'canUndo')::boolean THEN RAISE EXCEPTION 'Repeated undo allowed';END IF;
 PERFORM pg_temp.must_fail(format('SELECT record_partner_payout(%L,%L,%L)',p,first_version,'{"amount":1,"category":"Payout","description":"TEST stale payout","payment_method":"Cash","transaction_date":"2026-11-13"}'));
 -- Reassignment reuses released capacity and a second undo restores the previous valid allocation.
 PERFORM allocate_batch_investors(b,7000,allocation,2);
 PERFORM allocate_batch_investors(b,7000,jsonb_set(allocation,'{0,birds}','100'),3);
 PERFORM pg_temp.undo(p);
 IF NOT EXISTS(SELECT 1 FROM farm_partners WHERE id=p AND batch_id=b AND allocated_birds=50 AND initial_investment=350000) THEN RAISE EXCEPTION 'Previous valid allocation not restored';END IF;
 IF (SELECT sum(amount) FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL)<>25000 OR (SELECT count(*) FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL)<>1 THEN RAISE EXCEPTION 'Synchronized ledger not restored exactly once';END IF;
 -- Payouts use the same lock and version and block subsequent undo.
 PERFORM allocate_batch_investors(b,7000,jsonb_set(allocation,'{0,birds}','100'),5);
 SELECT allocation_version INTO first_version FROM farm_partners WHERE id=p;
 PERFORM record_partner_payout(p,first_version,'{"amount":1,"category":"Payout","description":"TEST approved payout","payment_method":"Cash","transaction_date":"2026-11-13"}');
 IF partner_undo_preview(p)->>'reason' NOT ILIKE '%payout%' THEN RAISE EXCEPTION 'Payout did not block undo';END IF;
 UPDATE partner_financials SET removed_at=now() WHERE partner_id=p AND type='payout';
 IF partner_undo_preview(p)->>'reason' NOT ILIKE '%payout%' THEN RAISE EXCEPTION 'Removing a payout erased the undo safeguard';END IF;
 PERFORM pg_temp.must_fail(format('INSERT INTO partner_financials(partner_id,type,category,amount,description,payment_method,transaction_date) VALUES(%L,''payout'',''Payout'',1,''TEST bypass'',''Cash'',current_date)',p));
 -- Signed agreements prevent undo even if the signature predates the latest allocation edit.
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,initial_investment) VALUES('TEST signed investor','08000000000','test-undo-signed','not-a-login',1) RETURNING id INTO p;
 INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST signed undo pool','Broiler',10,10,current_date) RETURNING id INTO b;
 PERFORM allocate_batch_investors(b,100,jsonb_build_array(jsonb_build_object('partnerId',p,'birds',5,'profitSharePercentage',70,'lossSharePercentage',100)),0);
 INSERT INTO official_agreements(partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES(p,'Cycle 1','TEST','{"partnerName":"TEST signed investor","deal":{"representative":"TEST Company","witnessName":"TEST Witness"}}',repeat('a',64),'test-owner') RETURNING id INTO a;
 PERFORM sign_official_agreement(a,'company','TEST Company','TEST PNG',repeat('a',64),'TEST explicit consent');
 IF partner_undo_preview(p)->>'reason' NOT ILIKE '%signed%' THEN RAISE EXCEPTION 'Company signature did not block undo';END IF;
 INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST reopened settlement','Broiler',10,10,current_date) RETURNING id INTO b;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,initial_investment) VALUES('TEST reopened investor','08000000000','test-undo-reopened','not-a-login',1) RETURNING id INTO p;
 PERFORM allocate_batch_investors(b,100,jsonb_build_array(jsonb_build_object('partnerId',p,'birds',5,'profitSharePercentage',70,'lossSharePercentage',100)),0);
 UPDATE farm_partners SET cycle_status='closed' WHERE id=p;
 UPDATE farm_partners SET cycle_status='open',settled_at=NULL,settlement_snapshot=NULL WHERE id=p;
 IF partner_undo_preview(p)->>'reason' NOT ILIKE '%settled%' THEN RAISE EXCEPTION 'Reopening a cycle bypassed settlement protection';END IF;
 IF has_function_privilege('anon','undo_partner_allocation(uuid,uuid,bigint,integer,integer,text)','EXECUTE') OR has_table_privilege('authenticated','partner_allocation_changes','SELECT') THEN RAISE EXCEPTION 'Undo snapshots or mutation are public';END IF;
END $$;
ROLLBACK;
