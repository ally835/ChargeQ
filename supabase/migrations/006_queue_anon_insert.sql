-- Allow anonymous inserts to queue_entries for demo/testing.
-- join_queue is SECURITY DEFINER so this is belt-and-suspenders.
-- Tighten to authenticated only post-launch if needed.
CREATE POLICY "anon_can_insert_queue"
  ON queue_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);
