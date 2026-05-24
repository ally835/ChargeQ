-- ============================================================
-- ChargeQ — Migration 003: SA reactivate manager
-- ============================================================

-- ── sa_reactivate_manager ─────────────────────────────────────────────
-- Reactivates a suspended site manager and sets a new initial PIN.
-- Requires super admin PIN. Manager must change PIN on next login.

CREATE OR REPLACE FUNCTION public.sa_reactivate_manager(
  sa_pin      TEXT,
  manager_id  UUID,
  initial_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE h TEXT;
BEGIN
  SELECT pin_hash INTO h FROM public.app_settings WHERE key = 'admin_pin' LIMIT 1;
  IF h IS NULL OR h != crypt(sa_pin, h) THEN RETURN FALSE; END IF;

  UPDATE public.site_managers
  SET status          = 'approved',
      pin_hash        = crypt(initial_pin, gen_salt('bf')),
      must_change_pin = TRUE,
      approved_at     = NOW(),
      approved_by     = 'superadmin'
  WHERE id = manager_id AND status = 'suspended';

  RETURN FOUND;
END;
$$;
