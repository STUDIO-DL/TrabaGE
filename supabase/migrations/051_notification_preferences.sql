-- =============================================
-- TrabaGE - Notification preferences
-- Per-user push notification preferences with RLS and OneSignal filtering helpers.
-- =============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  permission_status TEXT NOT NULL DEFAULT 'default'
    CHECK (permission_status IN ('default', 'granted', 'denied')),
  permission_prompted_at TIMESTAMPTZ,
  employment_new_jobs BOOLEAN NOT NULL DEFAULT TRUE,
  employment_application_updates BOOLEAN NOT NULL DEFAULT TRUE,
  employment_company_invitations BOOLEAN NOT NULL DEFAULT TRUE,
  companies_new_followers BOOLEAN NOT NULL DEFAULT TRUE,
  companies_verified BOOLEAN NOT NULL DEFAULT TRUE,
  companies_replies BOOLEAN NOT NULL DEFAULT TRUE,
  activity_likes BOOLEAN NOT NULL DEFAULT TRUE,
  activity_comments BOOLEAN NOT NULL DEFAULT TRUE,
  activity_new_followers BOOLEAN NOT NULL DEFAULT TRUE,
  activity_post_interactions BOOLEAN NOT NULL DEFAULT TRUE,
  messages_new BOOLEAN NOT NULL DEFAULT TRUE,
  messages_conversations BOOLEAN NOT NULL DEFAULT TRUE,
  account_security BOOLEAN NOT NULL DEFAULT TRUE CHECK (account_security = TRUE),
  system_updates BOOLEAN NOT NULL DEFAULT TRUE,
  system_features BOOLEAN NOT NULL DEFAULT TRUE,
  system_maintenance BOOLEAN NOT NULL DEFAULT TRUE,
  onesignal_tags_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users read own notification preferences"
ON public.notification_preferences
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users insert own notification preferences"
ON public.notification_preferences
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users update own notification preferences"
ON public.notification_preferences
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND account_security = TRUE);

CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.account_security := TRUE;
  IF NEW.permission_status = 'granted' AND NEW.permission_prompted_at IS NULL THEN
    NEW.permission_prompted_at := NOW();
  END IF;
  IF NEW.push_enabled = TRUE AND NEW.permission_status <> 'granted' THEN
    RAISE EXCEPTION 'Push permission must be granted before enabling notifications';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_preferences_updated_at();

INSERT INTO public.notification_preferences (user_id)
SELECT u.id
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_notification_preferences()
RETURNS public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_preferences public.notification_preferences;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = auth.uid();

  RETURN v_preferences;
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
    WHEN p_type IN ('new_application', 'application_viewed', 'application_contacted', 'application_accepted', 'application_rejected') THEN 'employment_application_updates'
    WHEN p_type IN ('company_invitation', 'candidate_invitation', 'interview_invitation') THEN 'employment_company_invitations'
    WHEN p_type IN ('new_follower', 'company_new_follower') THEN 'companies_new_followers'
    WHEN p_type IN ('verification_approved', 'verification_rejected', 'company_verified') THEN 'companies_verified'
    WHEN p_type IN ('company_reply', 'company_response') THEN 'companies_replies'
    WHEN p_type IN ('like', 'post_like') THEN 'activity_likes'
    WHEN p_type IN ('comment', 'post_comment') THEN 'activity_comments'
    WHEN p_type IN ('user_new_follower') THEN 'activity_new_followers'
    WHEN p_type IN ('new_post', 'post_interaction') THEN 'activity_post_interactions'
    WHEN p_type IN ('new_message') THEN 'messages_new'
    WHEN p_type IN ('conversation_update') THEN 'messages_conversations'
    WHEN p_type IN ('login', 'password_changed', 'security_alert', 'account_update') THEN 'account_security'
    WHEN p_type IN ('system_update') THEN 'system_updates'
    WHEN p_type IN ('new_feature') THEN 'system_features'
    WHEN p_type IN ('maintenance') THEN 'system_maintenance'
    ELSE 'system_updates'
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
    WHEN 'employment_company_invitations' THEN v_preferences.employment_company_invitations
    WHEN 'companies_new_followers' THEN v_preferences.companies_new_followers
    WHEN 'companies_verified' THEN v_preferences.companies_verified
    WHEN 'companies_replies' THEN v_preferences.companies_replies
    WHEN 'activity_likes' THEN v_preferences.activity_likes
    WHEN 'activity_comments' THEN v_preferences.activity_comments
    WHEN 'activity_new_followers' THEN v_preferences.activity_new_followers
    WHEN 'activity_post_interactions' THEN v_preferences.activity_post_interactions
    WHEN 'messages_new' THEN v_preferences.messages_new
    WHEN 'messages_conversations' THEN v_preferences.messages_conversations
    WHEN 'system_updates' THEN v_preferences.system_updates
    WHEN 'system_features' THEN v_preferences.system_features
    WHEN 'system_maintenance' THEN v_preferences.system_maintenance
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.filter_push_recipients(
  p_recipient_ids UUID[],
  p_type TEXT
)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT recipient_id), ARRAY[]::UUID[])
  FROM UNNEST(COALESCE(p_recipient_ids, ARRAY[]::UUID[])) AS recipients(recipient_id)
  WHERE public.user_allows_push_notification(recipient_id, p_type);
$$;

CREATE OR REPLACE FUNCTION public.notify_job_recommendations(
  p_job_id UUID,
  p_matches JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.jobs;
  v_company_id UUID;
  v_match JSONB;
  v_user_id UUID;
  v_score INT;
  v_frequency TEXT;
  v_push_recipients UUID[] := ARRAY[]::UUID[];
  v_in_app_count INT := 0;
  v_inserted_count INT := 0;
  v_link TEXT;
  v_dedup_key TEXT;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  v_company_id := v_job.company_id;
  IF auth.uid() IS NOT NULL AND auth.uid() != v_company_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_link := '/candidate/jobs/' || p_job_id::TEXT;

  FOR v_match IN SELECT * FROM jsonb_array_elements(COALESCE(p_matches, '[]'::jsonb))
  LOOP
    v_user_id := (v_match->>'user_id')::UUID;
    v_score := (v_match->>'score')::INT;

    IF v_user_id IS NULL OR v_score IS NULL OR v_score < 70 THEN
      CONTINUE;
    END IF;

    PERFORM public.upsert_job_match(v_user_id, p_job_id, v_score::SMALLINT);

    SELECT cp.notification_frequency INTO v_frequency
    FROM public.candidate_profiles cp
    WHERE cp.user_id = v_user_id
      AND cp.notifications_enabled = TRUE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_dedup_key := 'job_recommendation:' || v_user_id::TEXT || ':' || p_job_id::TEXT;

    INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
    VALUES (
      v_user_id,
      'job_recommendation',
      'Nueva oferta para ti',
      'La oferta "' || v_job.title || '" coincide con tu perfil.',
      jsonb_build_object(
        'link', v_link,
        'job_id', p_job_id,
        'score', v_score,
        'frequency', v_frequency
      ),
      v_dedup_key
    )
    ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    v_in_app_count := v_in_app_count + v_inserted_count;

    PERFORM public.track_recommendation_event(
      v_user_id,
      p_job_id,
      'notification_sent',
      jsonb_build_object('score', v_score, 'frequency', v_frequency)
    );

    IF v_inserted_count > 0
      AND v_frequency = 'instant'
      AND public.user_allows_push_notification(v_user_id, 'job_recommendation') THEN
      v_push_recipients := array_append(v_push_recipients, v_user_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'in_app_count', v_in_app_count,
    'push_recipient_ids', to_jsonb(v_push_recipients)
  );
END;
$$;

REVOKE ALL ON TABLE public.notification_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_notification_preferences() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_notification_preferences() TO authenticated;

REVOKE ALL ON FUNCTION public.notification_preference_column(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notification_preference_column(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.user_allows_push_notification(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_allows_push_notification(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.filter_push_recipients(UUID[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.filter_push_recipients(UUID[], TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) TO service_role;
