-- Fix RLS: SM uses anon role (PIN-gated in UI, not Supabase auth)
DROP POLICY IF EXISTS "site_ads_auth_insert" ON public.site_ads;
DROP POLICY IF EXISTS "site_ads_auth_update" ON public.site_ads;
DROP POLICY IF EXISTS "site_ads_auth_delete" ON public.site_ads;

CREATE POLICY "site_ads_anon_write" ON public.site_ads
  FOR ALL USING (true) WITH CHECK (true);

-- Track whether an ad has ever been live (used for draft vs previous grouping)
ALTER TABLE public.site_ads
  ADD COLUMN IF NOT EXISTS ever_active BOOLEAN NOT NULL DEFAULT false;
