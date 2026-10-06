-- Migration: Farm Management Suite (Batches, Financials, Leads CRM, Daily Activities & Mortality)
-- Date: 2026-10-06

-- 1. Farm Batches Table
CREATE TABLE IF NOT EXISTS public.farm_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL,
  batch_type text NOT NULL DEFAULT 'Broiler',
  initial_headcount integer NOT NULL DEFAULT 0,
  current_headcount integer NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_harvest_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Farm Financials (Expenses & Income) Table
CREATE TABLE IF NOT EXISTS public.farm_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.farm_batches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  payment_method text NOT NULL DEFAULT 'Bank Transfer',
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_no text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. CRM Customer Leads Table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  location text,
  lead_source text NOT NULL DEFAULT 'WhatsApp',
  interested_in text,
  status text NOT NULL DEFAULT 'New Lead' CHECK (status IN ('New Lead', 'Contacted', 'Interested / Negotiating', 'Converted to Customer', 'Lost / Inactive')),
  estimated_value numeric(12, 2) DEFAULT 0,
  notes text,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Farm Daily Activities & Mortality Log Table
CREATE TABLE IF NOT EXISTS public.farm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.farm_batches(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  activity_type text NOT NULL CHECK (activity_type IN ('Mortality Record', 'Feeding', 'Medication / Vaccination', 'Weight Check', 'Egg Collection', 'Cleaning & Sanitation', 'Pen Maintenance', 'General Activity')),
  mortality_count integer NOT NULL DEFAULT 0,
  cause_of_mortality text,
  feed_consumed_kg numeric(8, 2) NOT NULL DEFAULT 0,
  eggs_collected integer NOT NULL DEFAULT 0,
  medication_given text,
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_farm_financials_batch_id ON public.farm_financials(batch_id);
CREATE INDEX IF NOT EXISTS idx_farm_financials_date ON public.farm_financials(transaction_date);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON public.crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_farm_activities_batch_id ON public.farm_activities(batch_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_date ON public.farm_activities(activity_date);

-- Enable RLS & set policies
ALTER TABLE public.farm_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for farm_batches" ON public.farm_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for farm_financials" ON public.farm_financials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for crm_leads" ON public.crm_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for farm_activities" ON public.farm_activities FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.farm_batches TO anon, authenticated, service_role;
GRANT ALL ON public.farm_financials TO anon, authenticated, service_role;
GRANT ALL ON public.crm_leads TO anon, authenticated, service_role;
GRANT ALL ON public.farm_activities TO anon, authenticated, service_role;
