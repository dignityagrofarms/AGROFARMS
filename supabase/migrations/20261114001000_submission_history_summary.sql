-- Filter after selecting each submission's latest saved state, not its earlier events.
CREATE FUNCTION public.submission_history_summary(username_input text DEFAULT NULL,status_input text DEFAULT 'all',from_input date DEFAULT NULL,to_input date DEFAULT NULL,page_input integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH latest AS (
 SELECT DISTINCT ON(source_table,source_id) * FROM public.record_audit_events
 WHERE source_table IN('farm_financials','farm_activities','contact_transactions','farm_financial_payments')
 ORDER BY source_table,source_id,id DESC
 ), shaped AS (
 SELECT *,coalesce(after_data,before_data) AS record,
 CASE WHEN action='delete' THEN 'removed' ELSE coalesce(after_data->>'approval_status',before_data->>'approval_status','approved') END AS current_status
 FROM latest
 ), filtered AS (
 SELECT * FROM shaped WHERE (username_input IS NULL OR recorded_by=username_input)
 AND NOT(source_table='farm_financials' AND record->>'source_contact_id' IS NOT NULL)
 AND (status_input='all' OR current_status=status_input OR (status_input='pending_approval' AND current_status='pending'))
 AND (from_input IS NULL OR left(coalesce(record->>'transaction_date',record->>'activity_date',record->>'payment_date',record->>'created_at',created_at::text),10)::date>=from_input)
 AND (to_input IS NULL OR left(coalesce(record->>'transaction_date',record->>'activity_date',record->>'payment_date',record->>'created_at',created_at::text),10)::date<=to_input)
 ), page_rows AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET greatest(0,page_input)*25)
 SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM page_rows p),'[]'::jsonb),'total',(SELECT count(*) FROM filtered));
$$;
REVOKE ALL ON FUNCTION public.submission_history_summary(text,text,date,date,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submission_history_summary(text,text,date,date,integer) TO service_role;
