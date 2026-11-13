\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.headers='{"x-daf-actor":"{\"username\":\"test-owner\",\"role\":\"owner\"}"}';
DO $$
DECLARE contact_tx uuid; b uuid; f uuid; c uuid; p uuid; a uuid; pmt uuid; n numeric; snap jsonb; BEGIN
 INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST integrity','Broiler',20,20,current_date) RETURNING id INTO b;
 INSERT INTO farm_partners(full_name,phone,username,passcode_hash,batch_id,initial_investment,batch_allocation_percentage) VALUES('Test investor','08000000000','test-investor','test-only',b,1000,50) RETURNING id INTO p;
 INSERT INTO farm_financials(batch_id,type,category,amount,amount_paid,description,payment_method,transaction_date,approval_status,recorded_by,birds_sold)
 VALUES(b,'income','Bird Sales',700,0,'Seven birds','Cash',current_date,'approved','test-owner',7) RETURNING id INTO f;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>13 THEN RAISE EXCEPTION 'Expected 13 birds, got %',n; END IF;
 INSERT INTO farm_financial_payments(financial_id,amount,approval_status,recorded_by) VALUES(f,200,'pending','test-staff') RETURNING id INTO pmt;
 SELECT amount_paid INTO n FROM farm_financials WHERE id=f; IF n<>0 THEN RAISE EXCEPTION 'Pending payment counted'; END IF;
 UPDATE farm_financial_payments SET approval_status='approved' WHERE id=pmt;
 UPDATE farm_financial_payments SET approval_status='approved' WHERE id=pmt;
 SELECT amount_paid INTO n FROM farm_financials WHERE id=f; IF n<>200 THEN RAISE EXCEPTION 'Approval not idempotent: %',n; END IF;
 UPDATE farm_financials SET amount_paid=400 WHERE id=f;
 SELECT amount_paid INTO n FROM farm_financials WHERE id=f; IF n<>200 THEN RAISE EXCEPTION 'Redundant client balance update doubled receipt'; END IF;
 SELECT amount INTO n FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL; IF n<>100 THEN RAISE EXCEPTION 'Partner payment sync: %',n; END IF;
 BEGIN
  INSERT INTO farm_financial_payments(financial_id,amount,approval_status) VALUES(f,600,'approved');
  RAISE EXCEPTION 'Overpayment unexpectedly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Overpayment unexpectedly accepted' THEN RAISE; END IF; END;
 UPDATE farm_financial_payments SET approval_status='rejected' WHERE id=pmt;
 SELECT amount_paid INTO n FROM farm_financials WHERE id=f; IF n<>0 THEN RAISE EXCEPTION 'Payment reversal failed'; END IF;
 SELECT amount INTO n FROM partner_financials WHERE partner_id=p AND source_financial_id=f AND removed_at IS NULL; IF n<>0 THEN RAISE EXCEPTION 'Zero payment remains stale'; END IF;
 INSERT INTO special_contacts(contact_name,phone) VALUES('Test contact','08000000000') RETURNING id INTO c;
 INSERT INTO contact_transactions(contact_id,transaction_type,batch_id,item_description,quantity,unit,total_amount,amount_paid,approval_status,recorded_by,sync_to_farm)
 VALUES(c,'sale_to_contact',b,'2 broiler birds',2,'birds',200,100,'pending_approval','test-manager',true) RETURNING id INTO c;
 contact_tx:=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>13 THEN RAISE EXCEPTION 'Pending contact sale counted'; END IF;
 UPDATE contact_transactions SET approval_status='approved' WHERE id=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>11 THEN RAISE EXCEPTION 'Contact sale double counted: %',n; END IF;
 UPDATE contact_transactions SET quantity=1,total_amount=100 WHERE id=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>12 THEN RAISE EXCEPTION 'Contact correction failed: %',n; END IF;
 DELETE FROM contact_transactions WHERE id=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>13 THEN RAISE EXCEPTION 'Contact deletion failed'; END IF;
 INSERT INTO farm_financials(batch_id,type,category,amount,description,payment_method,transaction_date,approval_status,feed_bags,feed_kg_per_bag)
 VALUES(b,'expense','Feed',100,'Feed purchase','Cash',current_date,'approved',2,25);
 INSERT INTO farm_activities(batch_id,activity_date,activity_type,mortality_count,feed_consumed_kg,approval_status,recorded_by,feed_bag_no,feed_bag_status,feed_bags_used)
 VALUES(b,current_date,'Daily Log',1,25,'approved','test-staff',1,'finished',1) RETURNING id INTO a;
 UPDATE farm_activities SET mortality_count=2,feed_consumed_kg=30 WHERE id=a;
 SELECT mortality_count INTO n FROM partner_activities WHERE partner_id=p AND source_activity_id=a AND removed_at IS NULL; IF n<>1 THEN RAISE EXCEPTION 'Partner activity edit failed'; END IF;
 UPDATE farm_activities SET approval_status='rejected' WHERE id=a;
 SELECT count(*) INTO n FROM partner_activities WHERE partner_id=p AND source_activity_id=a AND removed_at IS NULL; IF n<>0 THEN RAISE EXCEPTION 'Rejected activity still visible'; END IF;
 BEGIN
  INSERT INTO farm_activities(batch_id,activity_date,activity_type,approval_status,feed_bag_no,feed_bag_status,feed_bags_used) VALUES(b,current_date+1,'Daily Log','approved',3,'finished',3);
  RAISE EXCEPTION 'Excess feed unexpectedly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Excess feed unexpectedly accepted' THEN RAISE; END IF; END;

 -- Storefront receipt is recognized when paid, physical stock only on fulfillment.
 INSERT INTO orders(order_code,track_code,customer_name,phone,address,delivery_zone,items,subtotal,delivery_fee,total,status,payment_status)
 VALUES('DAF-90001','DAF-90001','Test customer','2348000000000','Test address','owerri','[{"product":"Whole Broiler","option":"Whole","qty":2,"unitPrice":100}]',200,0,200,'received','pending') RETURNING id INTO c;
 UPDATE orders SET batch_id=b,payment_status='approved' WHERE id=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>13 THEN RAISE EXCEPTION 'Unfulfilled order deducted stock'; END IF;
 SELECT count(*) INTO n FROM partner_financials WHERE source_order_id=c AND removed_at IS NULL; IF n<>1 THEN RAISE EXCEPTION 'Storefront receipt mirror missing'; END IF;
 UPDATE orders SET status='delivered' WHERE id=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>11 THEN RAISE EXCEPTION 'Fulfillment did not deduct stock'; END IF;
 UPDATE orders SET status='cancelled' WHERE id=c;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>13 THEN RAISE EXCEPTION 'Fulfillment reversal failed'; END IF;
 SELECT count(*) INTO n FROM partner_financials WHERE source_order_id=c AND removed_at IS NULL; IF n<>0 THEN RAISE EXCEPTION 'Cancelled receipt remains'; END IF;
 INSERT INTO preorders(preorder_code,customer_name,phone,address,product,quantity,unit_price,total_amount,reservation_type,batch_id)
 VALUES('DEC-90001','Test customer','2348000000000','Test address','Whole Broiler',2,100,200,'free_reservation',b) RETURNING id INTO c;
 INSERT INTO preorder_payments(preorder_id,payment_reference,amount,confirmed_by_admin) VALUES(c,'test-installment',100,true) RETURNING id INTO pmt;
 UPDATE preorder_payments SET confirmed_by_admin=true WHERE id=pmt;
 SELECT amount_paid INTO n FROM preorders WHERE id=c; IF n<>100 THEN RAISE EXCEPTION 'Preorder payment duplicate'; END IF;
 DELETE FROM preorder_payments WHERE id=pmt;
 SELECT amount_paid INTO n FROM preorders WHERE id=c; IF n<>0 THEN RAISE EXCEPTION 'Preorder payment reversal failed'; END IF;
 SELECT count(*) INTO n FROM partner_financials WHERE source_preorder_id=c AND removed_at IS NULL; IF n<>0 THEN RAISE EXCEPTION 'Reversed preorder receipt remains'; END IF;
 -- Removing a source retains its retired partner copy as historical evidence.
 DELETE FROM farm_financials WHERE id=f;
 SELECT count(*) INTO n FROM partner_financials WHERE partner_id=p AND category='Bird Sales' AND removed_at IS NOT NULL;
 IF n<1 THEN RAISE EXCEPTION 'Deleted source erased partner history'; END IF;
 BEGIN
 INSERT INTO farm_financials(batch_id,type,category,amount,description,payment_method,transaction_date,approval_status,birds_sold) VALUES(b,'income','Bird Sales',999,'Impossible sale','Cash',current_date,'approved',999);
 RAISE EXCEPTION 'Overselling unexpectedly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Overselling unexpectedly accepted' THEN RAISE; END IF; END;
 PERFORM close_batch_reconciled(b,'Physical stock reconciled to zero for test');
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>0 THEN RAISE EXCEPTION 'Reconciliation failed'; END IF;
 UPDATE farm_batches SET status='active' WHERE id=b;
 SELECT live_birds INTO n FROM batch_stock_summary(ARRAY[b]); IF n<>0 THEN RAISE EXCEPTION 'Reopen resurrected stock'; END IF;
 SELECT count(*) INTO n FROM record_audit_events WHERE source_id=f AND actor_username='test-owner'; IF n<2 THEN RAISE EXCEPTION 'Actor audit missing'; END IF;
 SELECT after_data INTO snap FROM record_audit_events WHERE source_id=contact_tx ORDER BY id DESC LIMIT 1; IF snap IS NOT NULL THEN RAISE EXCEPTION 'Deletion history incorrect'; END IF;
 IF has_table_privilege('anon','farm_financials','SELECT') OR has_table_privilege('authenticated','contact_transactions','UPDATE') THEN RAISE EXCEPTION 'Public business access remains'; END IF;
 BEGIN
  DELETE FROM record_audit_events WHERE source_id=f;
  RAISE EXCEPTION 'Audit deletion unexpectedly accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Audit deletion unexpectedly accepted' THEN RAISE; END IF; END;
 IF has_function_privilege('anon','public.batch_stock_summary(uuid[])','EXECUTE') OR has_function_privilege('authenticated','public.allocate_batch_investors(uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Operational RPC access remains public'; END IF;
 RAISE NOTICE 'Integrity tests passed';
END $$;
ROLLBACK;
