-- Migration: Special Contacts Directory (Bulk Buyers, Offloaders & Suppliers) & Transaction Ledgers
-- Date: 2026-11-09

-- 1. Special Contacts Table (Bulk Buyers, Offloaders, Hatcheries, Feed Suppliers)
CREATE TABLE IF NOT EXISTS public.special_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  business_name text,
  contact_type text NOT NULL DEFAULT 'bulk_buyer' CHECK (contact_type IN ('bulk_buyer', 'supplier', 'offloader', 'logistics', 'other')),
  phone text NOT NULL,
  alt_phone text,
  whatsapp text,
  email text,
  location_address text,
  preferred_payment_terms text DEFAULT 'Bank Transfer',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Contact Transactions Table (Offloads, Bulk Purchases, Debt & Balance Tracking)
CREATE TABLE IF NOT EXISTS public.contact_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.special_contacts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale_to_contact', 'payment_from_contact', 'purchase_from_supplier', 'payment_to_supplier')),
  batch_id uuid REFERENCES public.farm_batches(id) ON DELETE SET NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  item_description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit text DEFAULT 'units',
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  amount_paid numeric(12, 2) NOT NULL DEFAULT 0,
  balance_due numeric(12, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Bank Transfer',
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending', 'overdue')),
  reference_no text,
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_special_contacts_type ON public.special_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_special_contacts_phone ON public.special_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_special_contacts_status ON public.special_contacts(status);
CREATE INDEX IF NOT EXISTS idx_contact_transactions_contact_id ON public.contact_transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_transactions_date ON public.contact_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_contact_transactions_batch_id ON public.contact_transactions(batch_id);

-- Enable RLS
ALTER TABLE public.special_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on special_contacts" ON public.special_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contact_transactions" ON public.contact_transactions FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.special_contacts TO anon, authenticated, service_role;
GRANT ALL ON public.contact_transactions TO anon, authenticated, service_role;
