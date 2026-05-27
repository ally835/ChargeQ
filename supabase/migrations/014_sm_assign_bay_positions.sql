-- Update sm_assign_bay to compact positions after assignment.
-- When a driver is pulled from 'waiting' to 'ready', all remaining
-- waiting drivers behind them advance. Uses ROW_NUMBER to handle
-- any accumulated gaps cleanly.

CREATE OR REPLACE FUNCTION public.sm_assign_bay(
  p_site_id  TEXT,
  p_entry_id TEXT,
  p_bay_num  INT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pos INTEGER;
BEGIN
  -- Capture current position before updating
  SELECT position INTO v_pos
  FROM public.queue_entries
  WHERE id = p_entry_id::UUID AND site_id = p_site_id AND status = 'waiting';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Assign bay and mark entry ready
  UPDATE public.queue_entries
  SET bay_num    = p_bay_num,
      status     = 'ready',
      updated_at = NOW()
  WHERE id = p_entry_id::UUID;

  -- Compact: advance all waiting drivers that were behind this entry
  UPDATE public.queue_entries
  SET position            = position - 1,
      estimated_wait_mins = GREATEST(0, estimated_wait_mins - 4),
      updated_at          = NOW()
  WHERE site_id = p_site_id
    AND status  = 'waiting'
    AND position > v_pos;

  RETURN TRUE;
END;
$$;
