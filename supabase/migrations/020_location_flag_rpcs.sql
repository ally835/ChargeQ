-- SA runs as anon (no JWT upgrade after PIN login), so direct UPDATE/DELETE
-- on location_flags are blocked by location_flags_update_auth and
-- location_flags_delete_auth (both require authenticated role).
-- SECURITY DEFINER RPCs bypass RLS for these two SA actions.

CREATE OR REPLACE FUNCTION public.mark_flag_actioned(p_flag_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.location_flags SET actioned = TRUE WHERE id = p_flag_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_location_flag(p_flag_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.location_flags WHERE id = p_flag_id;
  RETURN FOUND;
END;
$$;
