-- Migration to add HR Management tables, extended staff profiles, signed documents, suspensions, attendance, and payment receipts

-- 1. Extend admin_access with staff metadata
ALTER TABLE public.admin_access 
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'Farm Operations',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'on_leave', 'terminated')),
  ADD COLUMN IF NOT EXISTS join_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Staff Signed Documents Vault
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.admin_access(id) ON DELETE CASCADE,
  username text NOT NULL,
  document_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'contract', -- 'contract', 'nda', 'guarantor_form', 'id_card', 'other'
  file_url text NOT NULL,
  file_size text,
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.staff_documents TO service_role;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server access to staff documents" ON public.staff_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Staff Suspensions & Disciplinary Register
CREATE TABLE IF NOT EXISTS public.staff_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.admin_access(id) ON DELETE CASCADE,
  staff_username text NOT NULL,
  reason text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'revoked')),
  recorded_by text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.staff_suspensions TO service_role;
ALTER TABLE public.staff_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server access to staff suspensions" ON public.staff_suspensions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Staff Daily Attendance Register
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'on_leave')),
  clock_in_time timestamptz DEFAULT now(),
  clock_out_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(username, attendance_date)
);

GRANT ALL ON public.staff_attendance TO service_role;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server access to staff attendance" ON public.staff_attendance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Staff Monthly Payroll & Payment Receipts
CREATE TABLE IF NOT EXISTS public.staff_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  month_year text NOT NULL, -- e.g. 'October 2026'
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending_signature' CHECK (status IN ('pending_signature', 'signed', 'rejected')),
  signed_at timestamptz,
  receipt_voucher_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.staff_payment_receipts TO service_role;
ALTER TABLE public.staff_payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server access to staff payment receipts" ON public.staff_payment_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
