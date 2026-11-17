-- Migration: Strictly disable financial visibility for non-owner roles (staff & manager)
-- Guarantees that farm-wide financials, net profit/loss, and revenue totals remain exclusive to the Farm Owner

UPDATE public.app_settings
SET value = 'false'
WHERE key IN ('financial_visibility_staff', 'financial_visibility_manager');

INSERT INTO public.app_settings (key, value)
VALUES ('financial_visibility_staff', 'false'), ('financial_visibility_manager', 'false')
ON CONFLICT (key) DO UPDATE SET value = 'false';
