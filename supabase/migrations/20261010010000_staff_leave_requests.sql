-- Migration to add staff leave requests and add target_weeks to farm_batches

-- 1. Staff Leave Requests table
CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('annual', 'sick', 'emergency', 'casual')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.staff_leave_requests TO service_role;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server access to staff leave requests" ON public.staff_leave_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Add target_weeks column to farm_batches if not exists
ALTER TABLE public.farm_batches 
  ADD COLUMN IF NOT EXISTS target_weeks integer DEFAULT 7;
