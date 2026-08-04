-- =============================================
-- TrabaGE - Remove OneSignal leftovers (FCM-only push)
-- =============================================

-- Drop legacy OneSignal-only device rows (no FCM token).
UPDATE public.push_subscriptions
SET is_active = FALSE, updated_at = NOW()
WHERE is_active = TRUE
  AND (fcm_token IS NULL OR length(trim(fcm_token)) = 0);

DELETE FROM public.push_subscriptions
WHERE fcm_token IS NULL OR length(trim(fcm_token)) = 0;

-- Recreate upsert without OneSignal columns.
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
      platform,
      browser,
      user_agent,
      is_active,
      last_used_at
    )
    VALUES (
      v_uid,
      v_token,
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

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Drop OneSignal RPC.
DROP FUNCTION IF EXISTS public.set_onesignal_player_id(TEXT);

-- Drop unique constraint before dropping the column.
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_subscription_unique;

ALTER TABLE public.push_subscriptions
  DROP COLUMN IF EXISTS onesignal_subscription_id,
  DROP COLUMN IF EXISTS onesignal_external_id;

ALTER TABLE public.push_send_log
  DROP COLUMN IF EXISTS onesignal_notification_id;

ALTER TABLE public.candidate_profiles
  DROP COLUMN IF EXISTS onesignal_player_id;

ALTER TABLE public.company_profiles
  DROP COLUMN IF EXISTS onesignal_player_id;

ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS onesignal_tags_synced_at;

-- Require FCM token for new rows going forward.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN fcm_token SET NOT NULL;

NOTIFY pgrst, 'reload schema';
