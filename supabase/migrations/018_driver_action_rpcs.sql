-- Driver arrival confirmation: marks bay occupied + entry charging atomically.
-- Replaces direct table updates which were blocked by RLS.
CREATE OR REPLACE FUNCTION public.confirm_arrival(
  p_entry_id UUID,
  p_bay_num  INT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_site_id TEXT;
  v_plate   TEXT;
BEGIN
  SELECT site_id, plate INTO v_site_id, v_plate
  FROM queue_entries
  WHERE id = p_entry_id AND status = 'ready';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE queue_entries SET status = 'charging', updated_at = NOW() WHERE id = p_entry_id;

  UPDATE bays
  SET status = 'occupied', plate = v_plate, updated_at = NOW()
  WHERE site_id = v_site_id AND num = p_bay_num;

  RETURN TRUE;
END;
$$;

-- Driver done charging: frees bay + marks entry left atomically.
CREATE OR REPLACE FUNCTION public.done_charging(
  p_entry_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_site_id TEXT;
  v_bay_num INT;
BEGIN
  SELECT site_id, bay_num INTO v_site_id, v_bay_num
  FROM queue_entries
  WHERE id = p_entry_id AND status = 'charging';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE queue_entries SET status = 'left', updated_at = NOW() WHERE id = p_entry_id;

  IF v_bay_num IS NOT NULL THEN
    UPDATE bays SET status = 'free', plate = NULL, updated_at = NOW()
    WHERE site_id = v_site_id AND num = v_bay_num;
  END IF;

  RETURN TRUE;
END;
$$;

-- Site manager resolves a fault report.
CREATE OR REPLACE FUNCTION public.resolve_fault_report(
  p_fault_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE fault_reports SET resolved = TRUE, updated_at = NOW() WHERE id = p_fault_id;
  RETURN FOUND;
END;
$$;
