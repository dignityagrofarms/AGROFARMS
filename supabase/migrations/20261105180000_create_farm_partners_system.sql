-- Migration: Farm Partners & Investor Transparency System
-- Date: 2026-11-05

-- 1. Farm Partners Table (Investor profiles, capital, and portal credentials)
CREATE TABLE IF NOT EXISTS public.farm_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  username text UNIQUE NOT NULL,
  passcode_hash text NOT NULL,
  initial_investment numeric(14, 2) NOT NULL DEFAULT 0 CHECK (initial_investment >= 0),
  investment_date date NOT NULL DEFAULT CURRENT_DATE,
  target_roi_percentage numeric(6, 2) DEFAULT 0,
  agreed_terms text,
  project_name text NOT NULL DEFAULT 'Broiler Cycle Partnership',
  batch_id uuid REFERENCES public.farm_batches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'completed', 'paused')),
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Partner Financials Table (Expenses & Income keyed in specifically for this partner's investment)
CREATE TABLE IF NOT EXISTS public.partner_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.farm_partners(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.farm_batches(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  payment_method text NOT NULL DEFAULT 'Bank Transfer',
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_no text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Partner Activities & Stock Logs Table (Daily farm activities & stock logs for this partner)
CREATE TABLE IF NOT EXISTS public.partner_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.farm_partners(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.farm_batches(id) ON DELETE SET NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'Stock / Birds Received',
    'Feeding',
    'Mortality Record',
    'Weight Check',
    'Medication / Vaccination',
    'Cleaning & Sanitation',
    'Harvest & Sales Offload',
    'General Note'
  )),
  stock_headcount integer NOT NULL DEFAULT 0,
  mortality_count integer NOT NULL DEFAULT 0,
  cause_of_mortality text,
  feed_consumed_kg numeric(8, 2) NOT NULL DEFAULT 0,
  average_weight_kg numeric(6, 2) NOT NULL DEFAULT 0,
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farm_partners_username ON public.farm_partners(username);
CREATE INDEX IF NOT EXISTS idx_partner_financials_partner_id ON public.partner_financials(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_financials_date ON public.partner_financials(transaction_date);
CREATE INDEX IF NOT EXISTS idx_partner_activities_partner_id ON public.partner_activities(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_activities_date ON public.partner_activities(activity_date);

-- Security: Grant service_role full access
GRANT ALL ON public.farm_partners TO service_role;
GRANT ALL ON public.partner_financials TO service_role;
GRANT ALL ON public.partner_activities TO service_role;
