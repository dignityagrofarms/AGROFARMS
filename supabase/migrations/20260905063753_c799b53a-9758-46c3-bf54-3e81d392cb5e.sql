CREATE TABLE public.admin_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('owner', 'staff')),
  passcode_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_access TO service_role;
ALTER TABLE public.admin_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trusted server access to admin access" ON public.admin_access FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.discount_vouchers ADD COLUMN display_name text;
