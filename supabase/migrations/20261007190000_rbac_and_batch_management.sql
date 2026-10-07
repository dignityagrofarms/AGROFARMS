-- Migration to support 3 RBAC roles ('owner', 'manager', 'staff'), account recovery, and push subscriptions

ALTER TABLE public.admin_access DROP CONSTRAINT IF EXISTS admin_access_role_check;
ALTER TABLE public.admin_access ADD CONSTRAINT admin_access_role_check CHECK (role IN ('owner', 'manager', 'staff'));

ALTER TABLE public.admin_access ADD COLUMN IF NOT EXISTS recovery_key_hash text;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server access to push subscriptions" ON public.push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
