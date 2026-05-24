CREATE TABLE IF NOT EXISTS public.feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message      TEXT,
  site_key     TEXT,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_any" ON public.feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "feedback_select_auth" ON public.feedback
  FOR SELECT TO authenticated USING (true);
