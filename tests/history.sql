\set ON_ERROR_STOP on
BEGIN;
DO $$ DECLARE f uuid; result jsonb; BEGIN
 INSERT INTO public.farm_financials(type,category,amount,description,payment_method,transaction_date,approval_status,recorded_by)
 VALUES('expense','Other',100,'History filter test','Cash','2000-01-01','pending_approval','history_test') RETURNING id INTO f;
 UPDATE public.farm_financials SET approval_status='approved' WHERE id=f;
 UPDATE public.farm_financials SET approval_status='rejected' WHERE id=f;
 result:=public.submission_history_summary('history_test');
 IF (result->>'total')::integer<>1 THEN RAISE EXCEPTION 'History must count records, not events'; END IF;
 IF (public.submission_history_summary('history_test','approved')->>'total')::integer<>0 THEN RAISE EXCEPTION 'Old approved event leaked through current status filter'; END IF;
 IF (public.submission_history_summary('history_test','rejected')->>'total')::integer<>1 THEN RAISE EXCEPTION 'Latest rejected state missing'; END IF;
 IF (public.submission_history_summary('another_staff')->>'total')::integer<>0 THEN RAISE EXCEPTION 'Staff isolation failed'; END IF;
 IF (public.submission_history_summary('history_test','all','2026-01-01')->>'total')::integer<>0 THEN RAISE EXCEPTION 'Filter used audit date instead of business date'; END IF;
 IF has_function_privilege('anon','public.submission_history_summary(text,text,date,date,integer)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous RPC permission'; END IF;
 DELETE FROM public.farm_financials WHERE id=f;
 IF (public.submission_history_summary('history_test','removed')->>'total')::integer<>1 THEN RAISE EXCEPTION 'Deleted history lost'; END IF;
 INSERT INTO public.farm_financials(type,category,amount,description,payment_method,transaction_date,approval_status,recorded_by)
 SELECT 'expense','Other',n,'History page '||n,'Cash','2000-01-01','approved','history_page_test' FROM generate_series(1,60)n;
 UPDATE public.farm_financials SET description=description||' updated' WHERE recorded_by='history_page_test';
 UPDATE public.farm_financials SET approval_status='rejected' WHERE recorded_by='history_page_test' AND amount>30;
 IF (public.submission_history_summary('history_page_test')->>'total')::integer<>60 THEN RAISE EXCEPTION 'Large history count duplicates events'; END IF;
 IF jsonb_array_length(public.submission_history_summary('history_page_test','all',NULL,NULL,1)->'rows')<>25 THEN RAISE EXCEPTION 'Second page incomplete'; END IF;
 IF jsonb_array_length(public.submission_history_summary('history_page_test','all',NULL,NULL,2)->'rows')<>10 THEN RAISE EXCEPTION 'Last page incorrect'; END IF;
 IF (public.submission_history_summary('history_page_test','approved')->>'total')::integer<>30 THEN RAISE EXCEPTION 'Approved filter counted past states'; END IF;
 RAISE NOTICE 'History summary tests passed';
END $$;
ROLLBACK;
