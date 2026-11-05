-- Migration: Partner profit/loss sharing, cycles, payouts, soft-delete audit
-- Date: 2026-11-06

-- 1. Sharing terms + cycle details on partners
ALTER TABLE public.farm_partners
  ADD COLUMN IF NOT EXISTS profit_share_percentage numeric(5,2) NOT NULL DEFAULT 50
    CHECK (profit_share_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS loss_share_percentage numeric(5,2) NOT NULL DEFAULT 100
    CHECK (loss_share_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS cycle_name text NOT NULL DEFAULT 'Cycle 1',
  ADD COLUMN IF NOT EXISTS cycle_start_date date,
  ADD COLUMN IF NOT EXISTS cycle_end_date date,
  ADD COLUMN IF NOT EXISTS cycle_status text NOT NULL DEFAULT 'open'
    CHECK (cycle_status IN ('open', 'closed')),
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS settlement_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS terms_history jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.farm_partners
  SET cycle_start_date = investment_date
  WHERE cycle_start_date IS NULL;

-- 2. Payouts become their own entry type
ALTER TABLE public.partner_financials DROP CONSTRAINT IF EXISTS partner_financials_type_check;
ALTER TABLE public.partner_financials
  ADD CONSTRAINT partner_financials_type_check CHECK (type IN ('expense', 'income', 'payout'));

UPDATE public.partner_financials
  SET type = 'payout'
  WHERE type = 'income' AND category = 'Capital Repayment / Payout';

-- 3. Soft-delete audit trail (entries are never truly erased)
ALTER TABLE public.partner_financials
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by text,
  ADD COLUMN IF NOT EXISTS removal_reason text;

ALTER TABLE public.partner_activities
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by text,
  ADD COLUMN IF NOT EXISTS removal_reason text;
