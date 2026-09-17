-- 150_web_push_reliable_browser_delivery.sql
-- Deliver OS Web Push from the database as soon as a notification row exists.
-- Chrome/Android/desktop do not need the PWA installed; an active browser
-- subscription is enough. iOS still requires Add to Home Screen (platform limit).
--
-- Operator vault (reuse the existing cron auth if send_web_push_url is unset):
--   send_web_push_url = https://<project-ref>.supabase.co/functions/v1/send_web_push
--   push_cron_auth    = Bearer <SUPABASE_SERVICE_ROLE_KEY>  (or the raw key)
--   push_cron_url     = https://<project-ref>.supabase.co/functions/v1/send_push
-- Cron remains a backup for rows whose immediate pg_net call did not complete.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'push_send_log'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.push_send_log DROP CONSTRAINT IF EXISTS %I', rec.conname);
  END LOOP;

  ALTER TABLE public.push_send_log
    ADD CONSTRAINT push_send_log_status_check
    CHECK (status IN ('sent', 'failed', 'pending'));
END $$;

CREATE OR REPLACE FUNCTION public.push_notification_dedup_suffix(p_notification public.notifications)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    NULLIF(p_notification.metadata->>'message_id', ''),
    NULLIF(p_notification.metadata->>'conversation_id', ''),
    NULLIF(p_notification.metadata->>'job_id', ''),
    NULLIF(p_notification.metadata->>'application_id', ''),
    NULLIF(p_notification.metadata->>'post_id', ''),
    NULLIF(p_notification.metadata->>'comment_id', ''),
    NULLIF(p_notification.metadata->>'follower_id', ''),
    NULLIF(p_notification.metadata->>'target_id', ''),
    NULLIF(p_notification.metadata->>'request_id', ''),
    p_notification.id::TEXT
  );
$$;

CREATE OR REPLACE FUNCTION public.user_allows_push_notification(
  p_user_id UUID,
  p_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_preferences public.notification_preferences;
  v_has_subscription BOOLEAN := FALSE;
BEGIN
  IF NOT public.user_allows_notification(p_user_id, p_type) THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_preferences.permission_status = 'granted' THEN
    RETURN TRUE;
  END IF;

  -- A live Web Push subscription is proof the browser already granted OS permission,
  -- even if permission_status on the account row is stale (other device / missed sync).
  SELECT EXISTS (
    SELECT 1
    FROM public.push_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.is_active = TRUE
      AND s.endpoint IS NOT NULL
      AND length(trim(s.endpoint)) > 0
      AND s.p256dh IS NOT NULL
      AND s.auth IS NOT NULL
  ) INTO v_has_subscription;

  RETURN v_has_subscription;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_web_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_platform TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS public.push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.push_subscriptions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NULLIF(trim(p_endpoint), '') IS NULL
    OR NULLIF(trim(p_p256dh), '') IS NULL
    OR NULLIF(trim(p_auth), '') IS NULL THEN
    RAISE EXCEPTION 'Valid Web Push subscription required';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'push:register', 30, interval '1 hour');

  INSERT INTO public.push_subscriptions (
    user_id, endpoint, p256dh, auth, platform, browser, user_agent, is_active, last_seen_at, last_used_at
  )
  VALUES (
    v_uid,
    trim(p_endpoint),
    trim(p_p256dh),
    trim(p_auth),
    COALESCE(NULLIF(trim(p_platform), ''), public.detect_push_platform(p_user_agent)),
    NULLIF(trim(p_browser), ''),
    NULLIF(trim(p_user_agent), ''),
    TRUE,
    now(),
    now()
  )
  ON CONFLICT (user_id, endpoint) WHERE endpoint IS NOT NULL DO UPDATE SET
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    platform = EXCLUDED.platform,
    browser = COALESCE(EXCLUDED.browser, public.push_subscriptions.browser),
    user_agent = COALESCE(EXCLUDED.user_agent, public.push_subscriptions.user_agent),
    is_active = TRUE,
    last_seen_at = now(),
    last_used_at = now(),
    updated_at = now()
  RETURNING * INTO v_row;

  -- Mark OS permission as granted on this account. Do not flip push_enabled:
  -- the master toggle is owned by the settings UI / prompt.
  INSERT INTO public.notification_preferences (user_id, permission_status, permission_prompted_at)
  VALUES (v_uid, 'granted', now())
  ON CONFLICT (user_id) DO UPDATE SET
    permission_status = 'granted',
    permission_prompted_at = COALESCE(public.notification_preferences.permission_prompted_at, now());

  RETURN v_row;
END;
$$;

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
      WHERE p.dedup_key = concat_ws(
          ':',
          n.type,
          n.recipient_id::TEXT,
          public.push_notification_dedup_suffix(n)
        )
        AND (
          p.status = 'sent'
          OR (p.status = 'pending' AND p.created_at > NOW() - interval '2 minutes')
        )
    )
  ORDER BY n.created_at ASC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 40), 100), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_send_web_push_url()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_url TEXT;
  v_cron_url TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'send_web_push_url'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
  END;

  IF v_url IS NOT NULL AND length(trim(v_url)) > 0 THEN
    RETURN trim(v_url);
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_cron_url
    FROM vault.decrypted_secrets
    WHERE name = 'push_cron_url'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_cron_url := NULL;
  END;

  IF v_cron_url IS NULL OR length(trim(v_cron_url)) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN replace(trim(v_cron_url), '/functions/v1/send_push', '/functions/v1/send_web_push');
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_push_cron_auth()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_auth TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_auth
    FROM vault.decrypted_secrets
    WHERE name = 'push_cron_auth'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_auth IS NULL OR length(trim(v_auth)) = 0 THEN
    RETURN NULL;
  END IF;

  v_auth := trim(v_auth);
  IF v_auth ~* '^Bearer\s+' THEN
    RETURN v_auth;
  END IF;
  RETURN 'Bearer ' || v_auth;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_notification_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_url TEXT;
  v_auth TEXT;
  v_payload JSONB;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.user_allows_push_notification(NEW.recipient_id, NEW.type) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.push_subscriptions s
    WHERE s.user_id = NEW.recipient_id
      AND s.is_active = TRUE
      AND s.endpoint IS NOT NULL
      AND s.p256dh IS NOT NULL
      AND s.auth IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  v_url := public.resolve_send_web_push_url();
  v_auth := public.resolve_push_cron_auth();
  IF v_url IS NULL OR v_auth IS NULL THEN
    RETURN NEW;
  END IF;

  v_payload := COALESCE(NEW.metadata, '{}'::JSONB)
    || jsonb_build_object(
      'type', NEW.type,
      'notification_id', NEW.id,
      'link', COALESCE(NEW.metadata->>'link', '/')
    );

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_auth,
        'apikey', regexp_replace(v_auth, '^Bearer\s+', '', 'i')
      ),
      body := jsonb_build_object(
        'recipient_id', NEW.recipient_id,
        'notification_id', NEW.id,
        'title', NEW.title,
        'body', COALESCE(NULLIF(NEW.body, ''), NEW.title),
        'type', NEW.type,
        'data', v_payload
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'dispatch_notification_web_push pg_net failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_notification_web_push ON public.notifications;
CREATE TRIGGER trg_dispatch_notification_web_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_notification_web_push();

REVOKE ALL ON FUNCTION public.push_notification_dedup_suffix(public.notifications) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_notification_dedup_suffix(public.notifications) TO service_role;

REVOKE ALL ON FUNCTION public.user_allows_push_notification(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_allows_push_notification(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_send_web_push_url() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_send_web_push_url() TO service_role;

REVOKE ALL ON FUNCTION public.resolve_push_cron_auth() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_push_cron_auth() TO service_role;

REVOKE ALL ON FUNCTION public.dispatch_notification_web_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_notification_web_push() TO service_role;

REVOKE ALL ON FUNCTION public.upsert_web_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_web_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_pending_notification_pushes(INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_notification_pushes(INT, INT) TO service_role;

NOTIFY pgrst, 'reload schema';
