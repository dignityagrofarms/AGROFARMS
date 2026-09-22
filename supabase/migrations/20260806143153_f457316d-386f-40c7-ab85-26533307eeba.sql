ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS track_code text;
UPDATE public.orders SET track_code = 'DAF-' || upper(substr(md5(random()::text || id::text), 1, 6)) WHERE track_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_track_code_key ON public.orders (track_code);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;