-- Migration: Partner Terms & Conditions, Digital Signatures, and Written Agreement Attachments
-- Date: 2026-11-06

ALTER TABLE public.farm_partners
  ADD COLUMN IF NOT EXISTS agreement_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS agreement_signed_by text,
  ADD COLUMN IF NOT EXISTS agreement_signature_data text,
  ADD COLUMN IF NOT EXISTS agreement_terms text,
  ADD COLUMN IF NOT EXISTS agreement_document_url text,
  ADD COLUMN IF NOT EXISTS agreement_document_name text,
  ADD COLUMN IF NOT EXISTS agreement_document_size text,
  ADD COLUMN IF NOT EXISTS agreement_document_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS agreement_document_uploaded_by text;

-- Backfill agreement_terms with agreed_terms if null
UPDATE public.farm_partners
  SET agreement_terms = agreed_terms
  WHERE agreement_terms IS NULL AND agreed_terms IS NOT NULL;
