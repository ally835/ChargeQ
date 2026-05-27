-- Updated admin_simulate_arrival: assigns a free compatible bay at join time
-- so the full queue → occupy → free lifecycle can play out.
CREATE OR REPLACE FUNCTION public.admin_simulate_arrival(
  p_site_id   TEXT,
  p_site_name TEXT,
  p_charger   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n        TEXT;
  v_position INTEGER;
  v_wait     INTEGER;
  v_entry_id UUID;
  v_bay_num  INTEGER;
BEGIN
  -- Need at least one compatible bay to exist
  IF NOT EXISTS (
    SELECT 1 FROM public.bays WHERE site_id = p_site_id AND type = p_charger
  ) THEN
    RETURN jsonb_build_object('error', 'no_compatible_bay');
  END IF;

  v_n := to_char(floor(random() * 9000 + 1000)::int, 'FM9999');

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
  FROM public.queue_entries
  WHERE site_id = p_site_id AND status IN ('waiting', 'ready');

  v_wait := (v_position - 1) * 4;

  -- Assign the lowest-numbered free compatible bay (if any)
  SELECT num INTO v_bay_num
  FROM public.bays
  WHERE site_id = p_site_id AND type = p_charger AND status = 'free'
  ORDER BY num
  LIMIT 1;

  INSERT INTO public.queue_entries (
    site_id, site_name, user_id, name, phone, plate,
    charger, port_side, bay_num, position, estimated_wait_mins, status, is_remote
  ) VALUES (
    p_site_id, p_site_name, NULL,
    'Test Driver ' || v_n, '+61400000000', 'SIM' || v_n,
    p_charger, 'rr', v_bay_num, v_position, v_wait, 'waiting', false
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object(
    'entry_id', v_entry_id,
    'position', v_position,
    'plate',    'SIM' || v_n,
    'bay_num',  v_bay_num
  );
END;
$$;

-- Removes all sim/test queue entries (status = waiting/ready with NULL user_id).
-- Safe to call from the admin UI.
CREATE OR REPLACE FUNCTION public.clear_sim_entries(p_site_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM public.queue_entries
  WHERE site_id = p_site_id
    AND user_id  IS NULL
    AND status   IN ('waiting', 'ready')
  RETURNING 1 INTO v_count;

  -- Recompact positions for remaining entries
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS new_pos
    FROM public.queue_entries
    WHERE site_id = p_site_id AND status IN ('waiting', 'ready')
  )
  UPDATE public.queue_entries qe
  SET position = r.new_pos, estimated_wait_mins = (r.new_pos - 1) * 4
  FROM ranked r WHERE qe.id = r.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
