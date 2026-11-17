-- Migration: Ensure legacy agreement columns exist on farm_partners and refresh schema cache
-- Fixes missing 'agreement_signed' column in PostgREST schema cache on rollover and allocation queries

ALTER TABLE public.farm_partners
  ADD COLUMN IF NOT EXISTS agreement_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS agreement_signed_by text,
  ADD COLUMN IF NOT EXISTS agreement_terms text,
  ADD COLUMN IF NOT EXISTS agreement_document_url text,
  ADD COLUMN IF NOT EXISTS agreement_document_name text,
  ADD COLUMN IF NOT EXISTS agreement_document_size text,
  ADD COLUMN IF NOT EXISTS agreement_document_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS agreement_document_uploaded_by text;

NOTIFY pgrst, 'reload schema';

