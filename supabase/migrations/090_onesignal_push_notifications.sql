-- =============================================
-- TrabaGE - OneSignal push subscriptions (revert FCM transport)
-- Device registry, admin broadcasts, scheduling, RPCs
-- =============================================

CREATE TABLE IF NOT EXISTS public.push_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  onesignal_notification_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_send_log_dedup_key_unique UNIQUE (dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_push_send_log_dedup_created
  ON public.push_send_log(dedup_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_send_log_user_created
  ON public.push_send_log(user_id, created_at DESC);

ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_subscription_id TEXT NOT NULL,
  onesignal_external_id TEXT,
  platform TEXT NOT NULL DEFAULT 'web'
    CHECK (platform IN ('web', 'android', 'ios', 'unknown')),
  browser TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT push_subscriptions_subscription_unique UNIQUE (onesignal_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active_user
  ON public.push_subscriptions(user_id)
  WHERE is_active = TRUE;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users read own push subscriptions"
ON public.push_subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.admin_push_broadcast_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience_filter JSONB NOT NULL DEFAULT '{}'::JSONB,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'cancelled')),
  recipient_count INT NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_push_broadcast_log_created
  ON public.admin_push_broadcast_log(created_at DESC);

ALTER TABLE public.admin_push_broadcast_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read push broadcast log" ON public.admin_push_broadcast_log;
CREATE POLICY "Admins read push broadcast log"
ON public.admin_push_broadcast_log
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

CREATE TABLE IF NOT EXISTS public.scheduled_push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience_filter JSONB NOT NULL DEFAULT '{}'::JSONB,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
  broadcast_log_id UUID REFERENCES public.admin_push_broadcast_log(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_push_notifications_due
  ON public.scheduled_push_notifications(scheduled_at)
  WHERE status = 'scheduled';

ALTER TABLE public.scheduled_push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read scheduled push notifications" ON public.scheduled_push_notifications;
CREATE POLICY "Admins read scheduled push notifications"
ON public.scheduled_push_notifications
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

ALTER TABLE public.push_send_log
  DROP COLUMN IF EXISTS fcm_token;

ALTER TABLE public.push_send_log
  ADD COLUMN IF NOT EXISTS onesignal_notification_id TEXT;

CREATE OR REPLACE FUNCTION public.set_push_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_push_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION public.detect_push_platform(p_user_agent TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN coalesce(p_user_agent, '') ILIKE '%android%' THEN 'android'
    WHEN coalesce(p_user_agent, '') ILIKE '%iphone%' OR coalesce(p_user_agent, '') ILIKE '%ipad%' THEN 'ios'
    WHEN coalesce(p_user_agent, '') <> '' THEN 'web'
    ELSE 'unknown'
  END;
$$;

CREATE OR REPLACE FUNCTION public.detect_push_browser(p_user_agent TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN coalesce(p_user_agent, '') ILIKE '%edg/%' THEN 'edge'
    WHEN coalesce(p_user_agent, '') ILIKE '%chrome/%' AND coalesce(p_user_agent, '') NOT ILIKE '%edg/%' THEN 'chrome'
    WHEN coalesce(p_user_agent, '') ILIKE '%firefox/%' THEN 'firefox'
    WHEN coalesce(p_user_agent, '') ILIKE '%safari/%' AND coalesce(p_user_agent, '') NOT ILIKE '%chrome/%' THEN 'safari'
    ELSE NULL
  END;
$$;

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

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_push_subscription(
  p_onesignal_subscription_id TEXT DEFAULT NULL
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

  IF p_onesignal_subscription_id IS NOT NULL AND length(trim(p_onesignal_subscription_id)) > 0 THEN
    UPDATE public.push_subscriptions
    SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = v_uid
      AND onesignal_subscription_id = trim(p_onesignal_subscription_id);
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
RETURNS TABLE(user_id UUID, onesignal_subscription_id TEXT, platform TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ps.user_id, ps.onesignal_subscription_id, ps.platform
  FROM public.push_subscriptions ps
  WHERE ps.is_active = TRUE
    AND ps.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]));
$$;

CREATE OR REPLACE FUNCTION public.remove_invalid_push_subscription(p_onesignal_subscription_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.push_subscriptions
  SET is_active = FALSE, updated_at = NOW()
  WHERE onesignal_subscription_id = trim(p_onesignal_subscription_id);
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_preference_column(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_type IN ('job_recommendation', 'new_job') THEN 'employment_new_jobs'
    WHEN p_type IN ('application_viewed', 'application_contacted', 'application_accepted', 'application_rejected') THEN 'employment_application_updates'
    WHEN p_type = 'new_application' THEN 'employment_new_applications'
    WHEN p_type IN ('new_follower', 'company_new_follower') THEN 'companies_new_followers'
    WHEN p_type IN ('verification_submitted', 'verification_approved', 'verification_rejected', 'company_verified', 'user_verified') THEN 'companies_verified'
    WHEN p_type IN ('new_post', 'company_update') THEN 'activity_post_interactions'
    WHEN p_type IN ('new_message', 'conversation_update') THEN 'messages_new'
    WHEN p_type IN ('login', 'password_changed', 'security_alert', 'account_update') THEN 'account_security'
    WHEN p_type IN ('system_update', 'system_notification', 'system_alert', 'admin_notification', 'admin_broadcast') THEN 'system_updates'
    WHEN p_type IN ('marketing', 'promotional') THEN 'marketing_enabled'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_allows_push_notification(
  p_user_id UUID,
  p_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_preferences public.notification_preferences;
  v_column TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_column := public.notification_preference_column(p_type);

  IF v_column IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_column = 'account_security' THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_preferences.push_enabled IS NOT TRUE OR v_preferences.permission_status <> 'granted' THEN
    RETURN FALSE;
  END IF;

  RETURN CASE v_column
    WHEN 'employment_new_jobs' THEN v_preferences.employment_new_jobs
    WHEN 'employment_application_updates' THEN v_preferences.employment_application_updates
    WHEN 'employment_new_applications' THEN v_preferences.employment_new_applications
    WHEN 'companies_new_followers' THEN v_preferences.companies_new_followers
    WHEN 'companies_verified' THEN v_preferences.companies_verified
    WHEN 'activity_post_interactions' THEN v_preferences.activity_post_interactions
    WHEN 'messages_new' THEN v_preferences.messages_new
    WHEN 'system_updates' THEN v_preferences.system_updates
    WHEN 'marketing_enabled' THEN v_preferences.marketing_enabled
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_push_audience(p_filter JSONB DEFAULT '{}'::JSONB)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_roles TEXT[];
  v_city TEXT;
  v_sector TEXT;
  v_all BOOLEAN;
BEGIN
  IF auth.role() <> 'service_role' AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_all := COALESCE((p_filter->>'all')::BOOLEAN, FALSE);
  v_city := NULLIF(trim(p_filter->>'city'), '');
  v_sector := NULLIF(trim(p_filter->>'sector'), '');

  IF v_all THEN
    RETURN ARRAY(
      SELECT DISTINCT np.user_id
      FROM public.notification_preferences np
      WHERE np.push_enabled = TRUE
        AND np.permission_status = 'granted'
    );
  END IF;

  IF p_filter ? 'roles' AND jsonb_typeof(p_filter->'roles') = 'array' THEN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(p_filter->'roles')
    ) INTO v_roles;
  END IF;

  RETURN ARRAY(
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    LEFT JOIN public.company_profiles co ON co.user_id = ur.user_id
    JOIN public.notification_preferences np ON np.user_id = ur.user_id
    WHERE ur.role <> 'admin'
      AND np.push_enabled = TRUE
      AND np.permission_status = 'granted'
      AND (
        v_roles IS NULL
        OR cardinality(v_roles) = 0
        OR ur.role = ANY(v_roles)
      )
      AND (
        v_city IS NULL
        OR cp.city ILIKE ('%' || v_city || '%')
        OR co.city ILIKE ('%' || v_city || '%')
      )
      AND (
        v_sector IS NULL
        OR cp.sector ILIKE ('%' || v_sector || '%')
        OR co.sector ILIKE ('%' || v_sector || '%')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_push_broadcast_log(p_limit INT DEFAULT 50)
RETURNS SETOF public.admin_push_broadcast_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.admin_push_broadcast_log
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_schedule_push_notification(
  p_title TEXT,
  p_body TEXT,
  p_payload JSONB DEFAULT NULL,
  p_audience_filter JSONB DEFAULT '{}'::JSONB,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.scheduled_push_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.scheduled_push_notifications;
  v_log public.admin_push_broadcast_log;
  v_when TIMESTAMPTZ;
BEGIN
  IF auth.role() <> 'service_role' AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title required';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Body required';
  END IF;

  v_when := COALESCE(p_scheduled_at, NOW());

  INSERT INTO public.admin_push_broadcast_log (
    sent_by,
    audience_filter,
    title,
    body,
    payload,
    scheduled_at,
    status
  )
  VALUES (
    v_uid,
    COALESCE(p_audience_filter, '{}'::JSONB),
    trim(p_title),
    trim(p_body),
    p_payload,
    v_when,
    CASE WHEN v_when > NOW() THEN 'scheduled' ELSE 'pending' END
  )
  RETURNING * INTO v_log;

  IF v_when > NOW() THEN
    INSERT INTO public.scheduled_push_notifications (
      created_by,
      audience_filter,
      title,
      body,
      payload,
      scheduled_at,
      status,
      broadcast_log_id
    )
    VALUES (
      v_uid,
      COALESCE(p_audience_filter, '{}'::JSONB),
      trim(p_title),
      trim(p_body),
      p_payload,
      v_when,
      'scheduled',
      v_log.id
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_due_scheduled_push_notifications(p_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.scheduled_push_notifications;
  v_count INT := 0;
BEGIN
  IF auth.role() <> 'service_role' AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_row IN
    SELECT *
    FROM public.scheduled_push_notifications
    WHERE status = 'scheduled'
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.scheduled_push_notifications
    SET status = 'processing'
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('queued', v_count);
END;
$$;

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
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_push_subscriptions',
      'message', 'No hay suscripciones OneSignal registradas para este usuario en este dispositivo.'
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

REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon;
GRANT SELECT, DELETE ON TABLE public.push_subscriptions TO authenticated;

REVOKE ALL ON TABLE public.admin_push_broadcast_log FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.admin_push_broadcast_log TO authenticated;

REVOKE ALL ON TABLE public.scheduled_push_notifications FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.scheduled_push_notifications TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.deactivate_push_subscription(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_push_subscription(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_push_subscriptions_for_users(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_for_users(UUID[]) TO service_role;

REVOKE ALL ON FUNCTION public.remove_invalid_push_subscription(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_invalid_push_subscription(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.admin_resolve_push_audience(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_push_audience(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_push_broadcast_log(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_push_broadcast_log(INT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_schedule_push_notification(TEXT, TEXT, JSONB, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_schedule_push_notification(TEXT, TEXT, JSONB, JSONB, TIMESTAMPTZ) TO authenticated;

REVOKE ALL ON FUNCTION public.process_due_scheduled_push_notifications(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_due_scheduled_push_notifications(INT) TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.send_test_push_notification(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_test_push_notification(TEXT, TEXT) TO authenticated;

REVOKE ALL ON TABLE public.push_send_log FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
