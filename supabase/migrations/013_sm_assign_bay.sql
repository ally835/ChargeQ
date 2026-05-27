-- sm_assign_bay: site manager picks a free bay for a waiting driver
-- Sets bay_num + marks entry 'ready' in one atomic step.
-- The client then sends the SMS so the driver knows which bay to go to.

CREATE OR REPLACE FUNCTION public.sm_assign_bay(
  p_site_id  TEXT,
  p_entry_id TEXT,
  p_bay_num  INT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.queue_entries
  SET bay_num    = p_bay_num,
      status     = 'ready',
      updated_at = NOW()
  WHERE id      = p_entry_id::UUID
    AND site_id = p_site_id
    AND status  = 'waiting';

  RETURN FOUND;
END;
$$;
