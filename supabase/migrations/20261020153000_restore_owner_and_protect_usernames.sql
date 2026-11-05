-- Restore the primary "owner" / "admin" account if its role was accidentally overwritten
UPDATE public.admin_access
SET role = 'owner',
    active = true,
    status = 'active',
    updated_at = now()
WHERE lower(username) IN ('owner', 'admin')
  AND (role <> 'owner' OR active = false);

-- Ensure username is strictly unique (case-insensitive) in admin_access
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_access_username_lower
  ON public.admin_access (lower(username));
