-- Fix clear_sim_entries: RETURNING INTO fails on multi-row DELETE
CREATE OR REPLACE FUNCTION public.clear_sim_entries(p_site_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM public.queue_entries
  WHERE site_id = p_site_id
    AND user_id  IS NULL
    AND status   IN ('waiting', 'ready');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Recompact positions for any remaining real entries
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS new_pos
    FROM public.queue_entries
    WHERE site_id = p_site_id AND status IN ('waiting', 'ready')
  )
  UPDATE public.queue_entries qe
  SET position = r.new_pos, estimated_wait_mins = (r.new_pos - 1) * 4
  FROM ranked r WHERE qe.id = r.id;

  -- Also reset all bays to free
  UPDATE public.bays
  SET status = 'free', plate = NULL, updated_at = NOW()
  WHERE site_id = p_site_id;

  RETURN v_count;
END;
$$;

-- ── Placeholder bays for SA demo sites ───────────────────────────────
-- Westfield Bay A: 6 bays (CCS2 + Type2 mix)
INSERT INTO public.bays (site_id, num, type, status) VALUES
  ('westfield-bay-a', 1, 'ccs2',  'free'),
  ('westfield-bay-a', 2, 'ccs2',  'free'),
  ('westfield-bay-a', 3, 'type2', 'free'),
  ('westfield-bay-a', 4, 'type2', 'free'),
  ('westfield-bay-a', 5, 'ccs2',  'free'),
  ('westfield-bay-a', 6, 'chd',   'free')
ON CONFLICT (site_id, num) DO NOTHING;

-- Westfield Bay B: 4 bays
INSERT INTO public.bays (site_id, num, type, status) VALUES
  ('westfield-bay-b', 1, 'ccs2',  'free'),
  ('westfield-bay-b', 2, 'ccs2',  'free'),
  ('westfield-bay-b', 3, 'type2', 'free'),
  ('westfield-bay-b', 4, 'type2', 'free')
ON CONFLICT (site_id, num) DO NOTHING;

-- IKEA Tempe: 8 bays (larger carpark)
INSERT INTO public.bays (site_id, num, type, status) VALUES
  ('ikea-tempe', 1, 'ccs2',  'free'),
  ('ikea-tempe', 2, 'ccs2',  'free'),
  ('ikea-tempe', 3, 'ccs2',  'free'),
  ('ikea-tempe', 4, 'type2', 'free'),
  ('ikea-tempe', 5, 'type2', 'free'),
  ('ikea-tempe', 6, 'type2', 'free'),
  ('ikea-tempe', 7, 'chd',   'free'),
  ('ikea-tempe', 8, 'tesla', 'free')
ON CONFLICT (site_id, num) DO NOTHING;

-- Chatswood Chase: 6 bays
INSERT INTO public.bays (site_id, num, type, status) VALUES
  ('chatswood-chase', 1, 'ccs2',  'free'),
  ('chatswood-chase', 2, 'ccs2',  'free'),
  ('chatswood-chase', 3, 'type2', 'free'),
  ('chatswood-chase', 4, 'type2', 'free'),
  ('chatswood-chase', 5, 'tesla', 'free'),
  ('chatswood-chase', 6, 'chd',   'free')
ON CONFLICT (site_id, num) DO NOTHING;
