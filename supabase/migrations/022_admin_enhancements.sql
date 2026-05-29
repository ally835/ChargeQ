-- Schema additions
ALTER TABLE location_flags ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE fault_reports  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE fault_reports  ADD COLUMN IF NOT EXISTS forwarded_to_maintenance BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS pin_reset_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled      BOOLEAN     NOT NULL DEFAULT FALSE
);

-- archive_location_flag (SA)
CREATE OR REPLACE FUNCTION archive_location_flag(p_flag_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE location_flags SET archived = TRUE WHERE id = p_flag_id;
  RETURN FOUND;
END;
$$;

-- archive_fault_report (SM)
CREATE OR REPLACE FUNCTION archive_fault_report(p_fault_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE fault_reports SET archived = TRUE WHERE id = p_fault_id;
  RETURN FOUND;
END;
$$;

-- forward_fault_report (SM)
CREATE OR REPLACE FUNCTION forward_fault_report(p_fault_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE fault_reports SET forwarded_to_maintenance = TRUE WHERE id = p_fault_id;
  RETURN FOUND;
END;
$$;

-- sa_reset_manager_pin — resets PIN to '1234' and marks must_change_pin = TRUE
CREATE OR REPLACE FUNCTION sa_reset_manager_pin(sa_pin TEXT, p_manager_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  SELECT verify_admin_pin(sa_pin) INTO v_ok;
  IF NOT v_ok THEN RETURN FALSE; END IF;
  UPDATE site_managers
    SET pin_hash = crypt('1234', gen_salt('bf')), must_change_pin = TRUE
    WHERE id = p_manager_id;
  RETURN FOUND;
END;
$$;

-- sm_request_pin_reset — logs reset request; UI also opens mailto as backup
CREATE OR REPLACE FUNCTION sm_request_pin_reset(p_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO pin_reset_requests(email) VALUES(p_email);
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_location_flag(UUID)      TO anon;
GRANT EXECUTE ON FUNCTION archive_fault_report(UUID)       TO anon;
GRANT EXECUTE ON FUNCTION forward_fault_report(UUID)       TO anon;
GRANT EXECUTE ON FUNCTION sa_reset_manager_pin(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION sm_request_pin_reset(TEXT)       TO anon;
