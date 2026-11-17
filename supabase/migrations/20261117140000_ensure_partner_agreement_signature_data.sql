-- Migration: Ensure agreement_signature_data column exists on farm_partners and refresh schema cache
-- Fixes partner cycle rollover error when updating partner records

ALTER TABLE public.farm_partners
  ADD COLUMN IF NOT EXISTS agreement_signature_data text;

NOTIFY pgrst, 'reload schema';
