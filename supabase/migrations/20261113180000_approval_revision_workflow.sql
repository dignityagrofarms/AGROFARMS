-- Allow 'flagged' status for Admin -> Staff/Manager revision & correction workflow

ALTER TABLE IF EXISTS public.farm_financials
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE IF EXISTS public.farm_activities
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DO $$
DECLARE
  c_name text;
BEGIN
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.farm_financials'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%approval_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.farm_financials DROP CONSTRAINT %I', c_name);
  END LOOP;

  ALTER TABLE public.farm_financials
    ADD CONSTRAINT farm_financials_approval_status_check
    CHECK (approval_status IN ('approved', 'pending_approval', 'flagged', 'rejected'));

  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.farm_activities'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%approval_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.farm_activities DROP CONSTRAINT %I', c_name);
  END LOOP;

  ALTER TABLE public.farm_activities
    ADD CONSTRAINT farm_activities_approval_status_check
    CHECK (approval_status IN ('approved', 'pending_approval', 'flagged', 'rejected'));

  IF to_regclass('public.contact_transactions') IS NOT NULL THEN
    FOR c_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.contact_transactions'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%approval_status%'
    LOOP
      EXECUTE format('ALTER TABLE public.contact_transactions DROP CONSTRAINT %I', c_name);
    END LOOP;

    ALTER TABLE public.contact_transactions
      ADD CONSTRAINT contact_transactions_approval_status_check
      CHECK (approval_status IN ('approved', 'pending_approval', 'flagged', 'rejected'));
  END IF;

  IF to_regclass('public.farm_financial_payments') IS NOT NULL THEN
    FOR c_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.farm_financial_payments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%approval_status%'
    LOOP
      EXECUTE format('ALTER TABLE public.farm_financial_payments DROP CONSTRAINT %I', c_name);
    END LOOP;

    ALTER TABLE public.farm_financial_payments
      ADD CONSTRAINT farm_financial_payments_approval_status_check
      CHECK (approval_status IN ('pending', 'pending_approval', 'approved', 'flagged', 'rejected'));
  END IF;
END $$;
