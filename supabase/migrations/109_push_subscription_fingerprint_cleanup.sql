-- 109_push_subscription_fingerprint_cleanup.sql
-- When a device re-registers with a new OneSignal subscription id, deactivate
-- older active rows for the same user + platform + browser (same-device rotate).
-- Different devices (e.g. android phone + desktop chrome) stay active.

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_onesignal_subscription_id TEXT,
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_onesignal_subscription_id IS NULL OR length(trim(p_onesignal_subscription_id)) = 0 THEN
    RAISE EXCEPTION 'OneSignal subscription id required';
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

  INSERT INTO public.push_subscriptions (
    user_id,
    onesignal_subscription_id,
    onesignal_external_id,
    platform,
    browser,
    user_agent,
    is_active,
    last_used_at
  )
  VALUES (
    v_uid,
    trim(p_onesignal_subscription_id),
    v_uid::TEXT,
    v_platform,
    v_browser,
    NULLIF(trim(p_user_agent), ''),
    TRUE,
    NOW()
  )
  ON CONFLICT (onesignal_subscription_id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    onesignal_external_id = EXCLUDED.onesignal_external_id,
    platform = EXCLUDED.platform,
    browser = COALESCE(EXCLUDED.browser, public.push_subscriptions.browser),
    user_agent = COALESCE(EXCLUDED.user_agent, public.push_subscriptions.user_agent),
    is_active = TRUE,
    updated_at = NOW(),
    last_used_at = NOW()
  RETURNING * INTO v_row;

  -- Same-device fingerprint cleanup (avoid duplicate pushes after subscription rotation).
  UPDATE public.push_subscriptions
  SET is_active = FALSE, updated_at = NOW()
  WHERE user_id = v_uid
    AND is_active = TRUE
    AND onesignal_subscription_id IS DISTINCT FROM v_row.onesignal_subscription_id
    AND platform = v_row.platform
    AND COALESCE(browser, '') = COALESCE(v_row.browser, '');

  RETURN v_row;
END;
$$;

NOTIFY pgrst, 'reload schema';

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;
