\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.headers='{"x-daf-actor":"{\"username\":\"test-owner\",\"role\":\"owner\"}"}';
CREATE FUNCTION pg_temp.must_fail(command text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN RETURN; END; RAISE EXCEPTION 'Unexpectedly allowed: %',command; END $$;
DO $$
DECLARE b uuid; p uuid; q uuid; f uuid; a jsonb; rev integer; n numeric; BEGIN
 INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST automatic ownership','Broiler',200,200,current_date) RETURNING id INTO b;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,initial_investment) VALUES('TEST owner A','08000000000','test-auto-a','not-a-login',350000) RETURNING id INTO p;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,initial_investment) VALUES('TEST owner B','08000000000','test-auto-b','not-a-login',350000) RETURNING id INTO q;
 a:=jsonb_build_array(jsonb_build_object('partnerId',p,'birds',50,'profitSharePercentage',70,'lossSharePercentage',100),jsonb_build_object('partnerId',q,'birds',50,'profitSharePercentage',70,'lossSharePercentage',100));
 PERFORM allocate_batch_investors(b,7000,a,0);
 SELECT batch_allocation_percentage INTO n FROM farm_partners WHERE id=p;IF n<>25 THEN RAISE EXCEPTION 'Expected 25%% ownership: %',n;END IF;
 IF NOT EXISTS(SELECT 1 FROM farm_partners WHERE id=p AND initial_investment=350000 AND allocated_birds=50 AND auto_sync_batch) THEN RAISE EXCEPTION 'Automatic capital not saved';END IF;
 PERFORM pg_temp.must_fail(format('SELECT allocate_batch_investors(%L,7000,%L,0)',b,a));
 PERFORM pg_temp.must_fail(format('SELECT allocate_batch_investors(%L,7000,%L,1)',b,jsonb_set(a,'{0,birds}','151')));
 PERFORM pg_temp.must_fail(format('SELECT allocate_batch_investors(%L,7000,%L,1)',b,jsonb_set(a,'{0,birds}','2.5')));
 PERFORM pg_temp.must_fail(format('UPDATE farm_partners SET initial_investment=400000 WHERE id=%L',p));
 PERFORM pg_temp.must_fail(format('UPDATE farm_partners SET batch_allocation_percentage=100 WHERE id=%L',p));
 PERFORM pg_temp.must_fail(format('UPDATE farm_batches SET initial_headcount=201 WHERE id=%L',b));
 INSERT INTO farm_financials(batch_id,type,category,amount,amount_paid,description,payment_method,transaction_date,approval_status,birds_sold) VALUES(b,'income','Bird Sales',100000,100000,'TEST private customer details','Cash',current_date,'approved',10) RETURNING id INTO f;
 SELECT amount INTO n FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL;IF n<>25000 THEN RAISE EXCEPTION 'Incorrect proportional receipt %',n; END IF;
 PERFORM allocate_batch_investors(b,7000,a,1);
 IF (SELECT count(*) FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL)<>1 THEN RAISE EXCEPTION 'Repeated sync duplicated receipt';END IF;
 UPDATE farm_financials SET amount=80000,amount_paid=80000 WHERE id=f;
 SELECT amount INTO n FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL;IF n<>20000 THEN RAISE EXCEPTION 'Edited receipt not reconciled';END IF;
 UPDATE farm_financials SET approval_status='rejected' WHERE id=f;
 IF EXISTS(SELECT 1 FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL) THEN RAISE EXCEPTION 'Rejected receipt remains';END IF;
 UPDATE farm_partners SET cycle_status='closed' WHERE id=p;
 UPDATE farm_partners SET cycle_name='Cycle 2',cycle_status='open',allocated_birds=NULL,batch_id=NULL,initial_investment=0,batch_allocation_percentage=0,auto_sync_batch=false WHERE id=p;
 IF NOT EXISTS(SELECT 1 FROM batch_bird_allocations WHERE partner_id=p AND batch_id=b AND birds=50 AND closed_at IS NOT NULL) THEN RAISE EXCEPTION 'Rollover discarded original ownership';END IF;
 a:=jsonb_build_array(jsonb_build_object('partnerId',q,'birds',151,'profitSharePercentage',70,'lossSharePercentage',100));
 PERFORM pg_temp.must_fail(format('SELECT allocate_batch_investors(%L,7000,%L,2)',b,a));
 a:=jsonb_set(a,'{0,birds}','150');PERFORM allocate_batch_investors(b,7000,a,2);
 PERFORM pg_temp.must_fail(format('SELECT allocate_batch_investors(%L,7100,%L,3)',b,a));
 IF has_function_privilege('anon','allocate_batch_investors(uuid,numeric,jsonb,integer)','EXECUTE') OR has_table_privilege('authenticated','batch_bird_allocations','SELECT') THEN RAISE EXCEPTION 'Public allocation access'; END IF;
END $$;
DO $$
DECLARE b uuid; p uuid; q uuid; frozen jsonb:='{"test":"frozen historical settlement"}'; BEGIN
 INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST historical allocation','Broiler',200,200,current_date) RETURNING id INTO b;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,batch_id,initial_investment,cycle_status,settlement_snapshot) VALUES('TEST historical','08000000000','qa-history-birds','not-a-login',b,700000,'closed',frozen) RETURNING id INTO p;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,initial_investment) VALUES('TEST new investor','08000000000','qa-new-birds','not-a-login',700000) RETURNING id INTO q;
 PERFORM confirm_historical_birds(b,p,100,0);
 IF NOT EXISTS(SELECT 1 FROM farm_partners WHERE id=p AND initial_investment=700000 AND settlement_snapshot=frozen AND allocated_birds IS NULL AND batch_allocation_percentage=100 AND cycle_status='closed') THEN RAISE EXCEPTION 'Historical confirmation rewrote settled values'; END IF;
 PERFORM allocate_batch_investors(b,7000,jsonb_build_array(jsonb_build_object('partnerId',q,'birds',100,'profitSharePercentage',70,'lossSharePercentage',100)),1);
 IF (SELECT sum(birds) FROM batch_bird_allocations WHERE batch_id=b)<>200 THEN RAISE EXCEPTION 'Historical birds not reserved';END IF;
 PERFORM pg_temp.must_fail(format('SELECT confirm_historical_birds(%L,%L,100,2)',b,p));
 IF has_function_privilege('anon','confirm_historical_birds(uuid,uuid,integer,integer)','EXECUTE') OR has_function_privilege('authenticated','partner_batch_sales(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Private RPC exposed';END IF;
END $$;
ROLLBACK;
