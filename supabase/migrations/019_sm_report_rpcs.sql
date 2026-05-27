-- Site manager reads fault_reports and bay_taken_incidents via direct table
-- SELECT, but fault_reports_no_read (qual=false) blocks anon SELECT entirely.
-- SM has no Supabase JWT so RLS cannot identify them — SECURITY DEFINER RPCs
-- are the only safe path for SM reads on these tables.

CREATE OR REPLACE FUNCTION public.get_fault_reports(p_site_id TEXT)
RETURNS TABLE (
  id            UUID,
  bay_num       INT,
  fault_type    TEXT,
  description   TEXT,
  reported_at   TIMESTAMPTZ,
  resolved      BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, bay_num, fault_type, description, reported_at, resolved
  FROM   public.fault_reports
  WHERE  site_id = p_site_id
  ORDER  BY reported_at DESC
  LIMIT  50;
$$;

CREATE OR REPLACE FUNCTION public.get_bay_taken_incidents(p_site_id TEXT)
RETURNS TABLE (
  id             UUID,
  assigned_bay   INT,
  offender_plate TEXT,
  fault_type     TEXT,
  notes          TEXT,
  reported_at    TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, assigned_bay, offender_plate, fault_type, notes, reported_at
  FROM   public.bay_taken_incidents
  WHERE  site_id = p_site_id
  ORDER  BY reported_at DESC
  LIMIT  50;
$$;
