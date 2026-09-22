CREATE TABLE public.discount_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
  discount_value integer NOT NULL,
  recipient_name text,
  recipient_phone text,
  note text,
  expires_at timestamp with time zone,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_vouchers TO service_role;
ALTER TABLE public.discount_vouchers ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.set_discount_voucher_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER discount_vouchers_set_updated_at
BEFORE UPDATE ON public.discount_vouchers
FOR EACH ROW EXECUTE FUNCTION public.set_discount_voucher_updated_at();
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_code text;
