-- Allow the postgres role (used by pg_cron and SECURITY DEFINER functions)
-- to update bays and queue_entries without RLS interference.
-- These tables have RLS enabled but no UPDATE policies, which blocks
-- server-side batch operations like release_expired_ready().

CREATE POLICY "postgres_update_bays"
  ON public.bays FOR UPDATE TO postgres
  USING (true) WITH CHECK (true);

CREATE POLICY "postgres_update_queue_entries"
  ON public.queue_entries FOR UPDATE TO postgres
  USING (true) WITH CHECK (true);
