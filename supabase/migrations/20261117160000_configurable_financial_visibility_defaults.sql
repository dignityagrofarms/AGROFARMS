-- Migration: Configurable Financial Visibility for Staff & Managers
-- Default to 'false' (restricted) for both roles, while allowing Owner to toggle in Settings & Roles

INSERT INTO public.app_settings (key, value)
VALUES 
  ('financial_visibility_staff', 'false'),
  ('financial_visibility_manager', 'false')
ON CONFLICT (key) DO UPDATE 
SET value = 'false'
WHERE app_settings.value IS NULL;

