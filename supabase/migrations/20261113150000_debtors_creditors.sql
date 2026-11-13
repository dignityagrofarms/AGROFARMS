-- ============================================================
-- Migration: Debtors, Creditors & Partial Payment Tracking
-- Date: 2026-11-13
-- ============================================================

-- 1. Extend farm_financials with party_name, due_date, and amount_paid
-- amount_paid = NULL indicates legacy/full cash settlement (effective paid = amount).
ALTER TABLE public.farm_financials
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(12, 2);

CREATE INDEX IF NOT EXISTS idx_farm_financials_due_date
  ON public.farm_financials (due_date)
  WHERE due_date IS NOT NULL;

-- 2. Partial / follow-up payments ledger linked to farm_financials
CREATE TABLE IF NOT EXISTS public.farm_financial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_id uuid NOT NULL REFERENCES public.farm_financials(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_method text DEFAULT 'Bank Transfer',
  reference_no text,
  notes text,
  approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  recorded_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_financial_payments_financial_id
  ON public.farm_financial_payments (financial_id);

CREATE INDEX IF NOT EXISTS idx_farm_financial_payments_approval_status
  ON public.farm_financial_payments (approval_status);
