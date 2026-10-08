-- Migration: Create customer_complaints table
CREATE TABLE IF NOT EXISTS customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  order_code TEXT,
  category TEXT NOT NULL DEFAULT 'Other / General Feedback',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speedy querying by status and date
CREATE INDEX IF NOT EXISTS idx_customer_complaints_status ON customer_complaints(status);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_created ON customer_complaints(created_at DESC);

-- Enable RLS
ALTER TABLE customer_complaints ENABLE ROW LEVEL SECURITY;

-- Allow inserts from any user
CREATE POLICY "Allow public insert to customer_complaints" ON customer_complaints
  FOR INSERT WITH CHECK (true);

-- Allow full access for service_role / authenticated admin
CREATE POLICY "Allow service role full access on customer_complaints" ON customer_complaints
  FOR ALL USING (true);
