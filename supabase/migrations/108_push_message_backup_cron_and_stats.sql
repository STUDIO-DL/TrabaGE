-- 108_push_message_backup_cron_and_stats.sql
-- 1) Admin push delivery stats (push_send_log + subscriptions)
-- 2) Claim pending new_message notifications missing a successful push (server-side backup)
-- 3) Optional pg_cron + pg_net schedule (only if vault secrets exist)

CREATE OR REPLACE FUNCTION public.admin_get_push_delivery_stats(
  p_hours INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_sent BIGINT;
  v_failed BIGINT;
  v_active_devices BIGINT;
  v_users_with_device BIGINT;
  v_recent_errors JSONB;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_since := NOW() - make_interval(hours => GREATEST(COALESCE(p_hours, 24), 1));

  SELECT
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_sent, v_failed
  FROM public.push_send_log
  WHERE created_at >= v_since;

  SELECT COUNT(*) INTO v_active_devices
  FROM public.push_subscriptions
  WHERE is_active = TRUE;

  SELECT COUNT(DISTINCT user_id) INTO v_users_with_device
  FROM public.push_subscriptions
  WHERE is_active = TRUE;

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::JSONB)
  INTO v_recent_errors
  FROM (
    SELECT
      id,
      user_id,
      notification_type,
      left(COALESCE(error_message, ''), 180) AS error_message,
      created_at
    FROM public.push_send_log
    WHERE status = 'failed'
      AND created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 20
  ) x;

  RETURN jsonb_build_object(
    'window_hours', GREATEST(COALESCE(p_hours, 24), 1),
    'sent', COALESCE(v_sent, 0),
    'failed', COALESCE(v_failed, 0),
    'success_rate',
      CASE
        WHEN COALESCE(v_sent, 0) + COALESCE(v_failed, 0) = 0 THEN NULL
        ELSE ROUND(
          (COALESCE(v_sent, 0)::NUMERIC /
            (COALESCE(v_sent, 0) + COALESCE(v_failed, 0))::NUMERIC) * 100,
          1
        )
      END,
    'active_devices', COALESCE(v_active_devices, 0),
    'users_with_active_device', COALESCE(v_users_with_device, 0),
    'recent_errors', COALESCE(v_recent_errors, '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_push_delivery_stats(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_push_delivery_stats(INT) TO authenticated;

-- Pending message notifications without a successful push_send_log (backup for client dispatch).
CREATE OR REPLACE FUNCTION public.claim_pending_message_pushes(
  p_limit INT DEFAULT 40,
  p_lookback_minutes INT DEFAULT 10
)
RETURNS TABLE (
  notification_id UUID,
  recipient_id UUID,
  title TEXT,
  body TEXT,
  metadata JSONB,
  message_id TEXT,
  conversation_id TEXT,
  link TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id AS notification_id,
    n.recipient_id,
    n.title,
    n.body,
    n.metadata,
    n.metadata->>'message_id' AS message_id,
    n.metadata->>'conversation_id' AS conversation_id,
    n.metadata->>'link' AS link
  FROM public.notifications n
  WHERE n.type = 'new_message'
    AND n.created_at >= NOW() - make_interval(mins => GREATEST(COALESCE(p_lookback_minutes, 10), 1))
    AND COALESCE(n.metadata->>'message_id', '') <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM public.push_send_log p
      WHERE p.dedup_key = concat_ws(':', 'new_message', n.recipient_id::TEXT, n.metadata->>'message_id')
        AND p.status = 'sent'
    )
  ORDER BY n.created_at ASC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 40), 100), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_message_pushes(INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_message_pushes(INT, INT) TO service_role;

-- Optional automatic cron (Supabase): only when vault secrets are present.
-- Secrets expected in vault (Dashboard → Project Settings → Vault):
--   push_cron_url  = https://<project-ref>.supabase.co/functions/v1/send_push
--   push_cron_auth = Bearer <SERVICE_ROLE_KEY>
DO $$
DECLARE
  v_url TEXT;
  v_auth TEXT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net unavailable: %', SQLERRM;
    RETURN;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
    RETURN;
  END;

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'push_cron_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_auth
  FROM vault.decrypted_secrets
  WHERE name = 'push_cron_auth'
  LIMIT 1;

  IF v_url IS NULL OR v_auth IS NULL OR length(trim(v_url)) = 0 OR length(trim(v_auth)) = 0 THEN
    RAISE NOTICE 'Skipping push cron schedule: vault secrets push_cron_url / push_cron_auth not set';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'trabage_push_maintenance';

  PERFORM cron.schedule(
    'trabage_push_maintenance',
    '* * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', %L
        ),
        body := jsonb_build_object(
          'process_scheduled', true,
          'process_message_pushes', true
        )
      );
      $cron$,
      trim(v_url),
      trim(v_auth)
    )
  );

  RAISE NOTICE 'Scheduled trabage_push_maintenance cron (* * * * *)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule push cron: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
