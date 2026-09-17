-- =============================================
-- 147_job_match_outbox_system.sql
-- Reliable backend-triggered job-match processing + digest cron hooks.
--
-- Flow:
--   jobs INSERT/UPDATE → status = 'active' (from non-active)
--     → queue row in job_match_outbox
--   pg_net trigger on outbox INSERT (pending)
--     → Edge Function match_job_recommendations
--   Client notifyJobPublished remains optimistic fallback (idempotent).
--
-- Operator setup (Supabase Dashboard → Vault):
--   job_match_url  = https://<project-ref>.supabase.co/functions/v1/match_job_recommendations
--   job_match_auth = <SUPABASE_SERVICE_ROLE_KEY>
--   job_match_digest_url  = https://<project-ref>.supabase.co/functions/v1/send_job_match_digest
--   job_match_digest_auth = <SUPABASE_SERVICE_ROLE_KEY>
--
-- Optional Database Webhook (alternative to pg_net):
--   INSERT on public.job_match_outbox
--   URL: match_job_recommendations
--   Header: x-job-match-webhook-secret = <JOB_MATCH_WEBHOOK_SECRET>
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
-- =============================================

CREATE TABLE IF NOT EXISTS public.job_match_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text,
  attempt_count int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS job_match_outbox_status_queued_idx
  ON public.job_match_outbox (status, queued_at ASC);

ALTER TABLE public.job_match_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_match_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_match_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.queue_job_match_on_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.job_match_outbox (job_id, status, queued_at, processed_at, error_message, attempt_count)
  VALUES (NEW.id, 'pending', now(), NULL, NULL, 0)
  ON CONFLICT (job_id) DO UPDATE
  SET
    status = CASE
      WHEN public.job_match_outbox.status IN ('pending', 'processing') THEN public.job_match_outbox.status
      ELSE 'pending'
    END,
    queued_at = CASE
      WHEN public.job_match_outbox.status IN ('pending', 'processing') THEN public.job_match_outbox.queued_at
      ELSE now()
    END,
    processed_at = NULL,
    error_message = NULL,
    attempt_count = CASE
      WHEN public.job_match_outbox.status IN ('pending', 'processing') THEN public.job_match_outbox.attempt_count
      ELSE 0
    END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_job_match_on_active_insert ON public.jobs;
CREATE TRIGGER trg_queue_job_match_on_active_insert
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_job_match_on_active();

DROP TRIGGER IF EXISTS trg_queue_job_match_on_active_update ON public.jobs;
CREATE TRIGGER trg_queue_job_match_on_active_update
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_job_match_on_active();

CREATE OR REPLACE FUNCTION public.notify_job_match_outbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'job_match_url'
    LIMIT 1;

    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'job_match_auth'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
    v_key := NULL;
  END;

  IF v_url IS NULL OR length(trim(v_url)) = 0 OR v_key IS NULL OR length(trim(v_key)) = 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := trim(v_url),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || trim(v_key),
        'apikey', trim(v_key)
      ),
      body := jsonb_build_object(
        'job_id', NEW.job_id,
        'outbox_id', NEW.id,
        'source', 'outbox'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'job match pg_net notify failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_match_outbox_notify ON public.job_match_outbox;
CREATE TRIGGER trg_job_match_outbox_notify
  AFTER INSERT ON public.job_match_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_job_match_outbox();

CREATE OR REPLACE FUNCTION public.claim_job_match_outbox_batch(p_limit int DEFAULT 5)
RETURNS TABLE (
  outbox_id uuid,
  job_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT o.id
    FROM public.job_match_outbox o
    WHERE o.status IN ('pending', 'failed')
      AND o.attempt_count < 8
      AND (
        o.status = 'pending'
        OR o.processed_at IS NULL
        OR o.processed_at < now() - interval '10 minutes'
      )
    ORDER BY o.queued_at ASC
    LIMIT GREATEST(LEAST(COALESCE(p_limit, 5), 20), 1)
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.job_match_outbox o
    SET
      status = 'processing',
      attempt_count = o.attempt_count + 1,
      error_message = NULL
    FROM picked p
    WHERE o.id = p.id
    RETURNING o.id, o.job_id
  )
  SELECT u.id AS outbox_id, u.job_id
  FROM updated u;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_job_match_outbox(
  p_outbox_id uuid,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_outbox_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.job_match_outbox
  SET
    status = CASE
      WHEN p_status IN ('done', 'failed', 'pending', 'processing') THEN p_status
      ELSE 'failed'
    END,
    processed_at = now(),
    error_message = NULLIF(left(trim(COALESCE(p_error_message, '')), 500), '')
  WHERE id = p_outbox_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_job_match_outbox_batch(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_job_match_outbox(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_job_match_outbox_batch(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_job_match_outbox(uuid, text, text) TO service_role;

-- Optional retry + digest crons (only when vault secrets exist).
DO $$
DECLARE
  v_match_url text;
  v_match_auth text;
  v_digest_url text;
  v_digest_auth text;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'job match cron skipped (extensions): %', SQLERRM;
    RETURN;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_match_url
    FROM vault.decrypted_secrets WHERE name = 'job_match_url' LIMIT 1;
    SELECT decrypted_secret INTO v_match_auth
    FROM vault.decrypted_secrets WHERE name = 'job_match_auth' LIMIT 1;
    SELECT decrypted_secret INTO v_digest_url
    FROM vault.decrypted_secrets WHERE name = 'job_match_digest_url' LIMIT 1;
    SELECT decrypted_secret INTO v_digest_auth
    FROM vault.decrypted_secrets WHERE name = 'job_match_digest_auth' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_match_url IS NOT NULL AND v_match_auth IS NOT NULL
     AND length(trim(v_match_url)) > 0 AND length(trim(v_match_auth)) > 0 THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'trabage_job_match_outbox_retry';

    PERFORM cron.schedule(
      'trabage_job_match_outbox_retry',
      '*/5 * * * *',
      format(
        $cron$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'apikey', %L
          ),
          body := jsonb_build_object('process_outbox', true, 'limit', 10)
        );
        $cron$,
        trim(v_match_url),
        trim(v_match_auth),
        trim(v_match_auth)
      )
    );

    RAISE NOTICE 'Scheduled trabage_job_match_outbox_retry (*/5 * * * *)';
  END IF;

  IF v_digest_url IS NOT NULL AND v_digest_auth IS NOT NULL
     AND length(trim(v_digest_url)) > 0 AND length(trim(v_digest_auth)) > 0 THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('trabage_job_match_digest_daily', 'trabage_job_match_digest_weekly');

    PERFORM cron.schedule(
      'trabage_job_match_digest_daily',
      '0 8 * * *',
      format(
        $cron$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'apikey', %L
          ),
          body := jsonb_build_object('frequency', 'daily', 'limit', 50)
        );
        $cron$,
        trim(v_digest_url),
        trim(v_digest_auth),
        trim(v_digest_auth)
      )
    );

    PERFORM cron.schedule(
      'trabage_job_match_digest_weekly',
      '0 8 * * 1',
      format(
        $cron$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'apikey', %L
          ),
          body := jsonb_build_object('frequency', 'weekly', 'limit', 50)
        );
        $cron$,
        trim(v_digest_url),
        trim(v_digest_auth),
        trim(v_digest_auth)
      )
    );

    RAISE NOTICE 'Scheduled job match digest crons (daily 08:00 UTC, weekly Mon 08:00 UTC)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule job match crons: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
