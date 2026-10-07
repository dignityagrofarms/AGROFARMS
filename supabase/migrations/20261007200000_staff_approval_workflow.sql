-- Migration for Staff Approval Workflow & User Accounts Last Login tracking
ALTER TABLE public.admin_access 
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE public.farm_financials 
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending_approval', 'rejected')),
  ADD COLUMN IF NOT EXISTS recorded_by text;

ALTER TABLE public.farm_activities 
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending_approval', 'rejected')),
  ADD COLUMN IF NOT EXISTS recorded_by text;

-- Update existing records to approved
UPDATE public.farm_financials SET approval_status = 'approved' WHERE approval_status IS NULL;
UPDATE public.farm_activities SET approval_status = 'approved' WHERE approval_status IS NULL;
