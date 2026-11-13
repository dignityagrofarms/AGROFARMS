-- Existing production tables predate repository migration history. Test-only baseline.
CREATE TYPE public.preorder_payment_status AS ENUM ('pending','partially_paid','fully_paid');
CREATE TABLE public.preorders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), preorder_code text UNIQUE NOT NULL,
 customer_name text NOT NULL, phone text NOT NULL, email text DEFAULT '', address text NOT NULL,
 product text NOT NULL, quantity integer NOT NULL, unit_price numeric NOT NULL, total_amount numeric NOT NULL,
 amount_paid numeric NOT NULL DEFAULT 0, balance numeric GENERATED ALWAYS AS (greatest(0,total_amount-amount_paid)) STORED,
 reservation_type text NOT NULL, payment_status public.preorder_payment_status NOT NULL DEFAULT 'pending', delivery_status text DEFAULT 'pending',
 preferred_delivery_date date, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.preorder_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), preorder_id uuid REFERENCES public.preorders(id) ON DELETE CASCADE,
 payment_reference text UNIQUE NOT NULL, amount numeric NOT NULL, payment_method text, payment_date timestamptz DEFAULT now(),
 confirmed_by_admin boolean NOT NULL DEFAULT false, created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.preorders, public.preorder_payments TO service_role;
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recalculate_preorder_amount_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_paid INTEGER;
  order_total INTEGER;
  new_status preorder_payment_status;
BEGIN
  -- Sum all confirmed payments for this preorder
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM preorder_payments
  WHERE preorder_id = COALESCE(NEW.preorder_id, OLD.preorder_id)
    AND confirmed_by_admin = TRUE;

  -- Get order total
  SELECT total_amount INTO order_total
  FROM preorders
  WHERE id = COALESCE(NEW.preorder_id, OLD.preorder_id);

  -- Determine new status
  IF total_paid = 0 THEN
    new_status := 'pending';
  ELSIF total_paid >= order_total THEN
    new_status := 'fully_paid';
  ELSE
    new_status := 'partially_paid';
  END IF;

  -- Update the preorder
  UPDATE preorders
  SET amount_paid = total_paid,
      payment_status = new_status
  WHERE id = COALESCE(NEW.preorder_id, OLD.preorder_id);

  RETURN NEW;
END;
$function$
;
CREATE TRIGGER legacy_payment_total AFTER INSERT OR UPDATE OR DELETE ON public.preorder_payments FOR EACH ROW EXECUTE FUNCTION public.recalculate_preorder_amount_paid();
