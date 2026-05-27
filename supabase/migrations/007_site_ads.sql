-- Site-specific onsite advertising managed by site managers

CREATE TABLE IF NOT EXISTS public.site_ads (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     TEXT         NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  emoji       TEXT         NOT NULL DEFAULT '⚡',
  header      TEXT         NOT NULL DEFAULT '',
  body        TEXT         NOT NULL DEFAULT '',
  location    TEXT,
  code        TEXT,
  active      BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.site_ads ENABLE ROW LEVEL SECURITY;

-- Drivers (anon/authenticated) can read active ads for any site
CREATE POLICY "site_ads_public_select" ON public.site_ads
  FOR SELECT USING (true);

-- Authenticated users (site managers) can manage ads
CREATE POLICY "site_ads_auth_insert" ON public.site_ads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "site_ads_auth_update" ON public.site_ads
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "site_ads_auth_delete" ON public.site_ads
  FOR DELETE TO authenticated USING (true);
