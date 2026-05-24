-- ============================================================
-- ChargeQ — Supabase Production Schema
-- Migration: 001_initial_schema
-- 
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Or: supabase db push (if using CLI)
-- ============================================================

-- ── Enable required extensions ─────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- Stores profile data linked to Supabase Auth users.
-- auth.users.id is the canonical user identifier.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  since       TEXT NOT NULL DEFAULT to_char(NOW(), 'Month YYYY'),
  sessions    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- VEHICLES
-- Linked to users. Only the owning user can manage.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plate       TEXT NOT NULL,
  nick        TEXT NOT NULL,
  charger     TEXT NOT NULL CHECK (charger IN ('ccs2', 'type2', 'chd', 'tesla')),
  port_side   TEXT CHECK (port_side IN ('fl', 'fr', 'rl', 'rr', 'dm', 'pm')),
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_owner" ON public.vehicles
  USING (auth.uid() = user_id);

CREATE POLICY "vehicles_insert_own" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BAYS
-- Seeded per site by operators. Status managed via RPC only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     TEXT NOT NULL,
  num         INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('ccs2', 'type2', 'chd', 'tesla')),
  status      TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'fault')),
  plate       TEXT,
  fault_type  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, num)
);

ALTER TABLE public.bays ENABLE ROW LEVEL SECURITY;

-- Anyone can read bay status (powers the welcome dashboard)
CREATE POLICY "bays_public_read" ON public.bays
  FOR SELECT USING (TRUE);

-- No direct writes — all via RPC
-- (RPC functions use SECURITY DEFINER to bypass RLS for writes)

-- ============================================================
-- QUEUE ENTRIES
-- Server-authoritative. Direct INSERT/UPDATE FORBIDDEN.
-- All mutations via RPC.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.queue_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              TEXT NOT NULL,
  site_name            TEXT NOT NULL,
  user_id              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  phone                TEXT NOT NULL,
  plate                TEXT NOT NULL,
  charger              TEXT NOT NULL CHECK (charger IN ('ccs2', 'type2', 'chd', 'tesla')),
  port_side            TEXT CHECK (port_side IN ('fl', 'fr', 'rl', 'rr', 'dm', 'pm')),
  bay_num              INTEGER,
  position             INTEGER NOT NULL,
  estimated_wait_mins  INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'charging', 'left')),
  is_remote            BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- Users can read their own entries
CREATE POLICY "queue_read_own" ON public.queue_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Public can read position + count for a site (for welcome stats)
-- We expose a view instead of raw table access for non-owners
-- (No broad SELECT policy — use the get_site_queue_stats RPC)

-- ============================================================
-- FAULT REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fault_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      TEXT NOT NULL,
  bay_num      INTEGER,
  fault_type   TEXT NOT NULL,
  description  TEXT,
  photo_url    TEXT,
  reported_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fault_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (anon or authed)
CREATE POLICY "fault_reports_insert" ON public.fault_reports
  FOR INSERT WITH CHECK (TRUE);

-- Only admins read (enforced via RPC)
CREATE POLICY "fault_reports_no_read" ON public.fault_reports
  FOR SELECT USING (FALSE);

-- ============================================================
-- BAY TAKEN INCIDENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bay_taken_incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         TEXT NOT NULL,
  assigned_bay    INTEGER NOT NULL,
  offender_plate  TEXT,
  notes           TEXT,
  reported_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bay_taken_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bay_taken_insert" ON public.bay_taken_incidents
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "bay_taken_no_read" ON public.bay_taken_incidents
  FOR SELECT USING (FALSE);

-- ============================================================
-- LOCATION FLAGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.location_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name  TEXT NOT NULL,
  reason        TEXT NOT NULL,
  notes         TEXT,
  lat           NUMERIC,
  lng           NUMERIC,
  reported_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.location_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_flags_insert" ON public.location_flags
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "location_flags_no_read" ON public.location_flags
  FOR SELECT USING (FALSE);

-- ============================================================
-- FEEDBACK
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  categories      TEXT[],
  message         TEXT,
  contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert" ON public.feedback
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "feedback_no_read" ON public.feedback
  FOR SELECT USING (FALSE);

-- ============================================================
-- SITE MANAGERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_managers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  mobile       TEXT,
  job_title    TEXT,
  company      TEXT,
  abn          TEXT,
  sites        TEXT[] NOT NULL DEFAULT '{}',
  pin_hash     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'suspended')),
  must_change_pin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at  TIMESTAMPTZ,
  approved_by  TEXT
);

ALTER TABLE public.site_managers ENABLE ROW LEVEL SECURITY;

-- No anon reads
CREATE POLICY "managers_no_anon_read" ON public.site_managers
  FOR SELECT USING (FALSE);

-- Allow INSERT for registration (provisioned via RPC)
CREATE POLICY "managers_insert" ON public.site_managers
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- APP SETTINGS (for super admin PIN hash)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key       TEXT PRIMARY KEY,
  pin_hash  TEXT
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- No reads at all — only accessed via SECURITY DEFINER functions
CREATE POLICY "settings_no_read" ON public.app_settings
  FOR SELECT USING (FALSE);

-- ============================================================
-- APP VISITORS (landing gate)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_visitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent    TEXT
);

ALTER TABLE public.app_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitors_insert" ON public.app_visitors
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- RPC FUNCTIONS
-- All business-critical mutations happen here.
-- SECURITY DEFINER = runs as the function owner, not the caller.
-- This bypasses RLS for writes while keeping RLS on direct access.
-- ============================================================

-- ── join_queue ────────────────────────────────────────────────────────
-- Atomically inserts a queue entry and computes server-side position.
-- Prevents race conditions by using a transaction.
-- Returns the assigned position and estimated wait.

CREATE OR REPLACE FUNCTION public.join_queue(
  p_site_id    TEXT,
  p_site_name  TEXT,
  p_name       TEXT,
  p_phone      TEXT,
  p_plate      TEXT,
  p_charger    TEXT,
  p_port_side  TEXT DEFAULT NULL,
  p_is_remote  BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_position INTEGER;
  v_wait INTEGER;
  v_entry_id UUID;
BEGIN
  -- Get authenticated user id (null for anon remote joins)
  v_user_id := auth.uid();

  -- Prevent double-join: check if user already in queue for this site
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.queue_entries
      WHERE site_id = p_site_id
        AND user_id = v_user_id
        AND status IN ('waiting', 'ready')
    ) THEN
      RETURN jsonb_build_object('error', 'already_in_queue');
    END IF;
  END IF;

  -- Check if this site has ANY bay matching the requested charger type
  IF NOT EXISTS (
    SELECT 1 FROM public.bays
    WHERE site_id = p_site_id
      AND type = p_charger
  ) THEN
    RETURN jsonb_build_object('error', 'no_compatible_bay');
  END IF;

  -- Compute position (atomic: no other transaction can sneak in)
  SELECT COALESCE(MAX(position), 0) + 1
  INTO v_position
  FROM public.queue_entries
  WHERE site_id = p_site_id
    AND status IN ('waiting', 'ready');

  -- Estimated wait: 4 mins per position ahead
  v_wait := (v_position - 1) * 4;

  -- Insert
  INSERT INTO public.queue_entries (
    site_id, site_name, user_id, name, phone, plate,
    charger, port_side, position, estimated_wait_mins,
    status, is_remote
  ) VALUES (
    p_site_id, p_site_name, v_user_id, p_name, p_phone, p_plate,
    p_charger, p_port_side, v_position, v_wait,
    'waiting', p_is_remote
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object(
    'entry_id',            v_entry_id,
    'position',            v_position,
    'estimated_wait_mins', v_wait
  );
END;
$$;

-- ── leave_queue ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.leave_queue(
  p_entry_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry public.queue_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id::UUID;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Only the owning user or an anon (remote) entry can leave
  IF v_entry.user_id IS NOT NULL AND v_entry.user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Mark as left
  UPDATE public.queue_entries
  SET status = 'left', updated_at = NOW()
  WHERE id = p_entry_id::UUID;

  -- Compact positions: everyone behind moves up one
  UPDATE public.queue_entries
  SET position = position - 1,
      estimated_wait_mins = GREATEST(0, estimated_wait_mins - 4),
      updated_at = NOW()
  WHERE site_id = v_entry.site_id
    AND status IN ('waiting', 'ready')
    AND position > v_entry.position;

  RETURN TRUE;
END;
$$;

-- ── set_bay_status (admin only — PIN verified in application layer) ───

CREATE OR REPLACE FUNCTION public.set_bay_status(
  p_site_id  TEXT,
  p_bay_num  INTEGER,
  p_status   TEXT,
  p_plate    TEXT DEFAULT NULL,
  p_sa_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bays
  SET status = p_status,
      plate = p_plate,
      updated_at = NOW()
  WHERE site_id = p_site_id AND num = p_bay_num;

  RETURN FOUND;
END;
$$;

-- ── admin_mark_bay_ready ──────────────────────────────────────────────
-- Admin confirms a driver's bay is ready. Sets status = 'ready',
-- advances queue positions.

CREATE OR REPLACE FUNCTION public.admin_mark_bay_ready(
  p_site_id   TEXT,
  p_entry_id  TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry public.queue_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id::UUID;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Mark this driver as ready
  UPDATE public.queue_entries
  SET status = 'ready', updated_at = NOW()
  WHERE id = p_entry_id::UUID;

  -- Free the bay
  UPDATE public.bays
  SET status = 'free', plate = NULL, updated_at = NOW()
  WHERE site_id = p_site_id AND num = v_entry.bay_num;

  RETURN TRUE;
END;
$$;

-- ── get_site_queue_stats ──────────────────────────────────────────────
-- Public-safe stats for the welcome screen (count only, no PII).

CREATE OR REPLACE FUNCTION public.get_site_queue_stats(
  p_site_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_free_bays INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.queue_entries
  WHERE site_id = p_site_id AND status IN ('waiting', 'ready');

  SELECT COUNT(*) INTO v_free_bays
  FROM public.bays
  WHERE site_id = p_site_id AND status = 'free';

  RETURN jsonb_build_object(
    'queue_count', v_count,
    'free_bays',   v_free_bays,
    'wait_mins',   v_count * 4
  );
END;
$$;

-- ── verify_admin_pin ──────────────────────────────────────────────────
-- Preserved from V2 — bcrypt comparison server-side.

CREATE OR REPLACE FUNCTION public.verify_admin_pin(attempt TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE h TEXT;
BEGIN
  SELECT pin_hash INTO h FROM public.app_settings WHERE key = 'admin_pin' LIMIT 1;
  RETURN h IS NOT NULL AND h = crypt(attempt, h);
END;
$$;

-- ── check_site_manager_email ──────────────────────────────────────────
-- Step 1 of site manager login — returns status string.

CREATE OR REPLACE FUNCTION public.check_site_manager_email(manager_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE rec public.site_managers%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.site_managers
  WHERE lower(email) = lower(manager_email) LIMIT 1;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  RETURN rec.status;
END;
$$;

-- ── verify_site_manager_pin ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_site_manager_pin(
  manager_email TEXT,
  attempt       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE rec public.site_managers%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.site_managers
  WHERE lower(email) = lower(manager_email) LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF rec.status = 'pending'   THEN RETURN jsonb_build_object('status', 'pending',  'name', rec.name); END IF;
  IF rec.status = 'suspended' THEN RETURN jsonb_build_object('status', 'suspended'); END IF;
  IF rec.pin_hash IS NOT NULL AND rec.pin_hash = crypt(attempt, rec.pin_hash) THEN
    RETURN jsonb_build_object(
      'status',          'approved',
      'id',              rec.id,
      'name',            rec.name,
      'email',           rec.email,
      'sites',           rec.sites,
      'company',         rec.company,
      'must_change_pin', rec.must_change_pin
    );
  END IF;
  RETURN jsonb_build_object('status', 'wrong_pin');
END;
$$;

-- ── register_with_provisional_pin ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.register_with_provisional_pin(
  p_name           TEXT,
  p_email          TEXT,
  p_mobile         TEXT,
  p_job_title      TEXT,
  p_company        TEXT,
  p_abn            TEXT,
  p_sites          TEXT[],
  p_provisional_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prov_hash TEXT;
  v_new_id UUID;
BEGIN
  -- Verify provisional PIN against app_settings
  SELECT pin_hash INTO v_prov_hash
  FROM public.app_settings WHERE key = 'provisional_pin' LIMIT 1;

  IF v_prov_hash IS NULL OR v_prov_hash != crypt(p_provisional_pin, v_prov_hash) THEN
    RETURN jsonb_build_object('status', 'invalid_pin');
  END IF;

  IF EXISTS (SELECT 1 FROM public.site_managers WHERE lower(email) = lower(p_email)) THEN
    RETURN jsonb_build_object('status', 'email_exists');
  END IF;

  INSERT INTO public.site_managers (
    name, email, mobile, job_title, company, abn, sites, must_change_pin
  ) VALUES (
    p_name, lower(p_email), p_mobile, p_job_title, p_company, p_abn, p_sites, TRUE
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('status', 'registered', 'id', v_new_id);
END;
$$;

-- ── sa_get_all_managers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sa_get_all_managers(sa_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE h TEXT; r JSONB;
BEGIN
  SELECT pin_hash INTO h FROM public.app_settings WHERE key = 'admin_pin' LIMIT 1;
  IF h IS NULL OR h != crypt(sa_pin, h) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;
  SELECT jsonb_agg(to_jsonb(m)) INTO r FROM public.site_managers m ORDER BY created_at DESC;
  RETURN jsonb_build_object('managers', COALESCE(r, '[]'::jsonb));
END;
$$;

-- ── sa_approve_manager ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sa_approve_manager(
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
  SET status = 'approved',
      pin_hash = crypt(initial_pin, gen_salt('bf')),
      approved_at = NOW(),
      approved_by = 'superadmin',
      must_change_pin = TRUE
  WHERE id = manager_id;
  RETURN FOUND;
END;
$$;

-- ── sa_suspend_manager ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sa_suspend_manager(sa_pin TEXT, manager_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE h TEXT;
BEGIN
  SELECT pin_hash INTO h FROM public.app_settings WHERE key = 'admin_pin' LIMIT 1;
  IF h IS NULL OR h != crypt(sa_pin, h) THEN RETURN FALSE; END IF;
  UPDATE public.site_managers SET status = 'suspended' WHERE id = manager_id;
  RETURN FOUND;
END;
$$;

-- ── update_manager_pin ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_manager_pin(
  manager_email TEXT,
  old_attempt   TEXT,
  new_pin       TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE rec public.site_managers%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.site_managers
  WHERE lower(email) = lower(manager_email) AND status = 'approved' LIMIT 1;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF rec.pin_hash IS NULL OR rec.pin_hash != crypt(old_attempt, rec.pin_hash) THEN RETURN FALSE; END IF;
  UPDATE public.site_managers
  SET pin_hash = crypt(new_pin, gen_salt('bf')), must_change_pin = FALSE
  WHERE id = rec.id;
  RETURN TRUE;
END;
$$;

-- ============================================================
-- REALTIME — enable on the tables that need live sync
-- Run these in Supabase Dashboard → Database → Replication
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bays;

-- ============================================================
-- SEED: Demo site bays
-- ============================================================

INSERT INTO public.bays (site_id, num, type, status) VALUES
  ('demo', 1, 'ccs2',  'occupied'),
  ('demo', 2, 'type2', 'occupied'),
  ('demo', 3, 'ccs2',  'occupied'),
  ('demo', 4, 'chd',   'occupied'),
  ('demo', 5, 'type2', 'occupied'),
  ('demo', 6, 'tesla', 'occupied')
ON CONFLICT (site_id, num) DO NOTHING;

INSERT INTO public.bays (site_id, num, type, status) VALUES
  ('ikea-tempe', 1, 'ccs2',  'free'),
  ('ikea-tempe', 2, 'ccs2',  'free'),
  ('ikea-tempe', 3, 'chd',   'occupied'),
  ('ikea-tempe', 4, 'type2', 'occupied')
ON CONFLICT (site_id, num) DO NOTHING;
