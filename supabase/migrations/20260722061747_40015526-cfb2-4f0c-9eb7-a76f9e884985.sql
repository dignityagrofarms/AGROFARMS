
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','submitted','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason text;

UPDATE public.orders SET payment_status = 'approved', payment_approved_at = COALESCE(payment_approved_at, created_at)
WHERE payment_status = 'pending' AND created_at < now();
