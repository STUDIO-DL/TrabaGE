-- =============================================
-- TrabaGE - FCM push transport (replace OneSignal columns)
-- =============================================

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN onesignal_subscription_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_fcm_token_unique
  ON public.push_subscriptions (fcm_token)
  WHERE fcm_token IS NOT NULL;

ALTER TABLE public.push_send_log
  ADD COLUMN IF NOT EXISTS fcm_message_id TEXT;

-- Replace OneSignal-parameter RPCs with FCM-token variants (same arity).
DROP FUNCTION IF EXISTS public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.deactivate_push_subscription(TEXT);
DROP FUNCTION IF EXISTS public.get_push_subscriptions_for_users(UUID[]);
DROP FUNCTION IF EXISTS public.remove_invalid_push_subscription(TEXT);

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_fcm_token TEXT,
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
  v_platform TEXT;
  v_browser TEXT;
  v_token TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_token := NULLIF(trim(p_fcm_token), '');
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'FCM token required';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'push:register', 30, interval '1 hour');

  v_platform := COALESCE(
    NULLIF(trim(p_platform), ''),
    public.detect_push_platform(p_user_agent)
  );
  v_browser := COALESCE(
    NULLIF(trim(p_browser), ''),
    public.detect_push_browser(p_user_agent)
  );

  UPDATE public.push_subscriptions
  SET
    user_id = v_uid,
    onesignal_external_id = v_uid::TEXT,
    platform = v_platform,
    browser = COALESCE(v_browser, browser),
    user_agent = COALESCE(NULLIF(trim(p_user_agent), ''), user_agent),
    is_active = TRUE,
    updated_at = NOW(),
    last_used_at = NOW()
  WHERE fcm_token = v_token
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO public.push_subscriptions (
      user_id,
      fcm_token,
      onesignal_external_id,
      platform,
      browser,
      user_agent,
      is_active,
      last_used_at
    )
    VALUES (
      v_uid,
      v_token,
      v_uid::TEXT,
      v_platform,
      v_browser,
      NULLIF(trim(p_user_agent), ''),
      TRUE,
      NOW()
    )
    RETURNING * INTO v_row;
  END IF;

  -- Same-device fingerprint cleanup (avoid duplicate pushes after token rotation).
  UPDATE public.push_subscriptions
  SET is_active = FALSE, updated_at = NOW()
  WHERE user_id = v_uid
    AND is_active = TRUE
    AND fcm_token IS DISTINCT FROM v_row.fcm_token
    AND platform = v_row.platform
    AND COALESCE(browser, '') = COALESCE(v_row.browser, '');

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_push_subscription(
  p_fcm_token TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_fcm_token IS NOT NULL AND length(trim(p_fcm_token)) > 0 THEN
    UPDATE public.push_subscriptions
    SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = v_uid
      AND fcm_token = trim(p_fcm_token);
  ELSE
    UPDATE public.push_subscriptions
    SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = v_uid
      AND is_active = TRUE;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_push_subscriptions_for_users(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, fcm_token TEXT, platform TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ps.user_id, ps.fcm_token, ps.platform
  FROM public.push_subscriptions ps
  WHERE ps.is_active = TRUE
    AND ps.fcm_token IS NOT NULL
    AND length(trim(ps.fcm_token)) > 0
    AND ps.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]));
$$;

CREATE OR REPLACE FUNCTION public.remove_invalid_push_subscription(p_fcm_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.push_subscriptions
  SET is_active = FALSE, updated_at = NOW()
  WHERE fcm_token = trim(p_fcm_token);
  RETURN FOUND;
END;
$$;

NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.send_test_push_notification(
  p_title TEXT DEFAULT 'Prueba TrabaGE',
  p_body TEXT DEFAULT 'Notificación de prueba desde TrabaGE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.push_subscriptions
    WHERE user_id = v_uid
      AND is_active = TRUE
      AND fcm_token IS NOT NULL
      AND length(trim(fcm_token)) > 0
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_push_subscriptions',
      'message', 'No hay tokens FCM registrados para este usuario en este dispositivo.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'recipient_id', v_uid,
    'title', p_title,
    'body', p_body,
    'data', jsonb_build_object(
      'type', 'system_update',
      'link', '/personal/notifications',
      'test', true
    ),
    'hint', 'Invoca la edge function send_push con estos datos usando el JWT del usuario.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_test_push_notification(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_test_push_notification(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.deactivate_push_subscription(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_push_subscription(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_push_subscriptions_for_users(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_for_users(UUID[]) TO service_role;

REVOKE ALL ON FUNCTION public.remove_invalid_push_subscription(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_invalid_push_subscription(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

