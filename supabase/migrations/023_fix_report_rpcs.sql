-- Fix: bay_taken_incidents missing resolved + archived columns
ALTER TABLE public.bay_taken_incidents
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Must drop before recreating — PostgreSQL won't allow changing return type in-place
DROP FUNCTION IF EXISTS public.get_fault_reports(TEXT);
DROP FUNCTION IF EXISTS public.get_bay_taken_incidents(TEXT);

-- Fix: get_fault_reports was not returning archived or forwarded_to_maintenance
CREATE OR REPLACE FUNCTION public.get_fault_reports(p_site_id TEXT)
RETURNS TABLE (
  id                      UUID,
  bay_num                 INT,
  fault_type              TEXT,
  description             TEXT,
  reported_at             TIMESTAMPTZ,
  resolved                BOOLEAN,
  archived                BOOLEAN,
  forwarded_to_maintenance BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, bay_num, fault_type, description, reported_at,
         resolved, archived, forwarded_to_maintenance
  FROM   public.fault_reports
  WHERE  site_id = p_site_id
  ORDER  BY reported_at DESC
  LIMIT  50;
$$;

-- Fix: get_bay_taken_incidents was not returning resolved or archived
CREATE OR REPLACE FUNCTION public.get_bay_taken_incidents(p_site_id TEXT)
RETURNS TABLE (
  id             UUID,
  assigned_bay   INT,
  offender_plate TEXT,
  fault_type     TEXT,
  notes          TEXT,
  reported_at    TIMESTAMPTZ,
  resolved       BOOLEAN,
  archived       BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, assigned_bay, offender_plate, fault_type, notes,
         reported_at, resolved, archived
  FROM   public.bay_taken_incidents
  WHERE  site_id = p_site_id
  ORDER  BY reported_at DESC
  LIMIT  50;
$$;

-- New: resolve_bay_taken_incident
CREATE OR REPLACE FUNCTION public.resolve_bay_taken_incident(p_incident_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bay_taken_incidents SET resolved = TRUE WHERE id = p_incident_id;
  RETURN FOUND;
END;
$$;

-- New: archive_bay_taken_incident
CREATE OR REPLACE FUNCTION public.archive_bay_taken_incident(p_incident_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bay_taken_incidents SET archived = TRUE WHERE id = p_incident_id;
  RETURN FOUND;
END;
$$;

-- Fix: mark_flag_actioned and resolve_fault_report were never granted to anon
GRANT EXECUTE ON FUNCTION public.mark_flag_actioned(UUID)         TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_fault_report(UUID)       TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_bay_taken_incident(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.archive_bay_taken_incident(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_fault_reports(TEXT)          TO anon;
GRANT EXECUTE ON FUNCTION public.get_bay_taken_incidents(TEXT)    TO anon;
