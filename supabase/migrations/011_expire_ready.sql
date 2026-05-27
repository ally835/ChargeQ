-- Client-callable: expires the calling driver's own ready entry and frees the bay.
CREATE OR REPLACE FUNCTION public.expire_my_entry(p_entry_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id TEXT;
  v_bay_num  INTEGER;
BEGIN
  SELECT site_id, bay_num INTO v_site_id, v_bay_num
  FROM   public.queue_entries
  WHERE  id      = p_entry_id
    AND  status  = 'ready'
    AND  (user_id = auth.uid() OR auth.uid() IS NULL);

  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.queue_entries
  SET    status = 'expired', updated_at = now()
  WHERE  id = p_entry_id;

  IF v_bay_num IS NOT NULL THEN
    UPDATE public.bays
    SET    status = 'free', plate = NULL
    WHERE  site_id = v_site_id AND num = v_bay_num;
  END IF;
END;
$$;

-- Batch server-side expiry (call manually or schedule via Supabase dashboard cron).
-- Requires pg_cron to be enabled: Extensions → pg_cron in the Supabase dashboard,
-- then run: SELECT cron.schedule('expire-ready-queue', '* * * * *', 'SELECT public.release_expired_ready()');
CREATE OR REPLACE FUNCTION public.release_expired_ready()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, site_id, phone, name, site_name, bay_num
    FROM   public.queue_entries
    WHERE  status     = 'ready'
      AND  updated_at < now() - interval '5 minutes'
  LOOP
    UPDATE public.queue_entries
    SET    status = 'expired', updated_at = now()
    WHERE  id = rec.id;

    IF rec.bay_num IS NOT NULL THEN
      UPDATE public.bays
      SET    status = 'free', plate = NULL
      WHERE  site_id = rec.site_id AND num = rec.bay_num;
    END IF;

    -- pg_net SMS (uncomment once pg_cron + pg_net are enabled in the dashboard):
    -- PERFORM net.http_post(
    --   url     := 'https://ywrijveuirrdszfuubrb.supabase.co/functions/v1/send-sms',
    --   headers := jsonb_build_object(
    --     'Content-Type',     'application/json',
    --     'Authorization',    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cmlqdmV1aXJyZHN6ZnV1YnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDgyNzIsImV4cCI6MjA5NDIyNDI3Mn0.KdhJ0ksf4kNUpHBQtzoQNz4wGDIB-lF5NjkM6qkXCBg',
    --     'x-chargeq-secret', '4fc0b3a7f1ca0262ad67cdaf947ebca2e1ff92abf641c753658ccb7b2f26ec33'
    --   ),
    --   body := jsonb_build_object(
    --     'to',   rec.phone,
    --     'body', format('ChargeQ: Your 5-minute window at %s has expired and your bay has been released. Open the app to rejoin.', rec.site_name)
    --   )
    -- );
  END LOOP;
END;
$$;
