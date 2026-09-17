-- 148_claim_pending_notification_pushes.sql
-- Server-side backup so OS web push is not lost when the actor's browser
-- never invokes send_push (tab closed, invoke failure, etc.).

CREATE OR REPLACE FUNCTION public.claim_pending_notification_pushes(
  p_limit INT DEFAULT 40,
  p_lookback_minutes INT DEFAULT 10
)
RETURNS TABLE (
  notification_id UUID,
  recipient_id UUID,
  type TEXT,
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
    n.type,
    n.title,
    n.body,
    n.metadata,
    n.metadata->>'message_id' AS message_id,
    n.metadata->>'conversation_id' AS conversation_id,
    n.metadata->>'link' AS link
  FROM public.notifications n
  WHERE n.created_at >= NOW() - make_interval(mins => GREATEST(COALESCE(p_lookback_minutes, 10), 1))
    AND EXISTS (
      SELECT 1
      FROM public.push_subscriptions s
      WHERE s.user_id = n.recipient_id
        AND s.is_active = TRUE
        AND s.endpoint IS NOT NULL
    )
    AND (
      n.type IS DISTINCT FROM 'new_message'
      OR (
        COALESCE(n.metadata->>'message_id', '') ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1
          FROM public.messages m
          WHERE m.id::text = n.metadata->>'message_id'
            AND public.message_is_active(m.deleted_at, m.expires_at)
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.push_send_log p
      WHERE p.status = 'sent'
        AND p.dedup_key = concat_ws(
          ':',
          n.type,
          n.recipient_id::TEXT,
          COALESCE(
            NULLIF(n.metadata->>'message_id', ''),
            NULLIF(n.metadata->>'conversation_id', ''),
            NULLIF(n.metadata->>'job_id', ''),
            NULLIF(n.metadata->>'application_id', ''),
            NULLIF(n.metadata->>'post_id', ''),
            NULLIF(n.metadata->>'comment_id', ''),
            NULLIF(n.metadata->>'follower_id', ''),
            NULLIF(n.metadata->>'target_id', ''),
            NULLIF(n.metadata->>'request_id', ''),
            'general'
          )
        )
    )
  ORDER BY n.created_at ASC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 40), 100), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_notification_pushes(INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_notification_pushes(INT, INT) TO service_role;

COMMENT ON FUNCTION public.claim_pending_notification_pushes(INT, INT) IS
  'Claims recent in-app notifications lacking a successful push_send_log for users with an active Web Push subscription.';

-- Refresh the optional cron payload so the existing job also backs up non-message pushes.
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
    RAISE NOTICE 'Skipping push cron reschedule: vault secrets push_cron_url / push_cron_auth not set';
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
          'process_message_pushes', true,
          'process_notification_pushes', true
        )
      );
      $cron$,
      trim(v_url),
      trim(v_auth)
    )
  );

  RAISE NOTICE 'Rescheduled trabage_push_maintenance cron (* * * * *)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not reschedule push cron: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
