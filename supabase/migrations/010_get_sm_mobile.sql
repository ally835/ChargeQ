-- Returns the mobile number of the approved site manager for a given site.
-- SECURITY DEFINER so anon drivers can call it without direct access to site_managers.
CREATE OR REPLACE FUNCTION public.get_site_manager_mobile(p_site_id TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mobile
  FROM   public.site_managers
  WHERE  status = 'approved'
    AND  p_site_id = ANY(sites)
  LIMIT  1;
$$;
