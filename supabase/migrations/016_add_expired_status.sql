-- Add 'expired' to the queue_entries status check constraint.
-- Was missing when the expired timeout flow was added in 011_expire_ready.sql.

ALTER TABLE public.queue_entries DROP CONSTRAINT queue_entries_status_check;
ALTER TABLE public.queue_entries ADD CONSTRAINT queue_entries_status_check
  CHECK (status = ANY (ARRAY['waiting'::text, 'ready'::text, 'charging'::text, 'left'::text, 'expired'::text]));
