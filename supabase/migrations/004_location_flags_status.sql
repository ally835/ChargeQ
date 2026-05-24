-- Add status tracking and RLS write policies to location_flags

ALTER TABLE public.location_flags
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS actioned_at TIMESTAMPTZ;

CREATE POLICY "location_flags_update_auth" ON public.location_flags
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "location_flags_delete_auth" ON public.location_flags
  FOR DELETE TO authenticated USING (true);
