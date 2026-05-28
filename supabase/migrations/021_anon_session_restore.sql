-- Restores an in-progress queue session when the Supabase auth session
-- has expired (e.g. token refresh failed, long inactivity).
-- The client caches the entry_id in localStorage on join; on reload it
-- calls this RPC to verify the entry is still active before showing the
-- queue screen without requiring re-authentication.
-- Scoped to site_id so a cached ID from Site A can't restore on Site B.

CREATE OR REPLACE FUNCTION public.get_queue_entry_by_id(
  p_entry_id UUID,
  p_site_id  TEXT
)
RETURNS TABLE (
  id                   UUID,
  site_id              TEXT,
  site_name            TEXT,
  plate                TEXT,
  charger              TEXT,
  port_side            TEXT,
  bay_num              INT,
  "position"           INT,
  estimated_wait_mins  INT,
  status               TEXT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, site_id, site_name, plate, charger, port_side, bay_num,
         "position", estimated_wait_mins, status
  FROM   public.queue_entries
  WHERE  id      = p_entry_id
    AND  site_id = p_site_id
    AND  status IN ('waiting', 'ready', 'charging')
  LIMIT 1;
$$;
