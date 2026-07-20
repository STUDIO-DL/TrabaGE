-- =============================================
-- TrabaGE - Unified in-app + push notification delivery
-- Master toggle and category preferences gate both channels.
-- Push additionally requires permission_status = 'granted'.
-- =============================================

CREATE OR REPLACE FUNCTION public.user_allows_notification(
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

  IF NOT FOUND OR v_preferences.push_enabled IS NOT TRUE THEN
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

  RETURN v_preferences.permission_status = 'granted';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification public.notifications;
  v_application_id UUID;
  v_job_id UUID;
  v_dedup_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.assert_rate_limit(auth.uid(), 'notification:create', 60, interval '1 hour');

  IF p_title IS NULL OR char_length(trim(p_title)) = 0 OR char_length(p_title) > 180 THEN
    RAISE EXCEPTION 'Invalid notification title';
  END IF;

  IF p_body IS NOT NULL AND char_length(p_body) > 1000 THEN
    RAISE EXCEPTION 'Invalid notification body';
  END IF;

  v_application_id := NULLIF(p_metadata->>'application_id', '')::UUID;
  v_job_id := NULLIF(p_metadata->>'job_id', '')::UUID;

  IF p_recipient_id = auth.uid() THEN
    NULL;
  ELSIF p_type = 'new_application' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id = auth.uid()
        AND a.job_id = v_job_id
        AND j.company_id = p_recipient_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('application_viewed', 'application_contacted', 'application_accepted', 'application_rejected') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = v_application_id
        AND a.candidate_id = p_recipient_id
        AND j.company_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('verification_approved', 'verification_rejected') THEN
    IF public.get_my_role() <> 'admin' THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.user_allows_notification(p_recipient_id, p_type) THEN
    RETURN NULL;
  END IF;

  v_dedup_key := md5(concat_ws(':', p_recipient_id::TEXT, p_type, coalesce(v_application_id::TEXT, ''), coalesce(v_job_id::TEXT, ''), coalesce(p_title, '')));

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
  VALUES (p_recipient_id, p_type, p_title, p_body, p_metadata, v_dedup_key)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO UPDATE
  SET title = EXCLUDED.title,
      body = EXCLUDED.body,
      metadata = EXCLUDED.metadata
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_followers(
  p_target_type TEXT,
  p_target_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient_ids UUID[];
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_target_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH inserted AS (
    INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
    SELECT
      f.user_id,
      p_type,
      p_title,
      p_body,
      p_metadata,
      md5(concat_ws(':', f.user_id::TEXT, p_type, p_target_type, p_target_id::TEXT, coalesce(p_title, ''), coalesce(p_body, ''), coalesce(p_metadata::TEXT, '')))
    FROM public.follows f
    WHERE f.target_type = p_target_type
      AND f.target_id = p_target_id
      AND public.user_allows_notification(f.user_id, p_type)
    ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    RETURNING recipient_id
  )
  SELECT COALESCE(ARRAY_AGG(recipient_id), ARRAY[]::UUID[])
  INTO v_recipient_ids
  FROM inserted;

  RETURN v_recipient_ids;
END;
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

  v_link := '/personal/jobs/' || p_job_id::TEXT;

  FOR v_match IN SELECT * FROM jsonb_array_elements(COALESCE(p_matches, '[]'::jsonb))
  LOOP
    v_user_id := (v_match->>'user_id')::UUID;
    v_score := (v_match->>'score')::INT;

    IF v_user_id IS NULL OR v_score IS NULL OR v_score < 70 THEN
      CONTINUE;
    END IF;

    IF NOT public.user_allows_notification(v_user_id, 'job_recommendation') THEN
      CONTINUE;
    END IF;

    PERFORM public.upsert_job_match(v_user_id, p_job_id, v_score::SMALLINT);

    SELECT cp.notification_frequency INTO v_frequency
    FROM public.candidate_profiles cp
    WHERE cp.user_id = v_user_id;

    IF NOT FOUND THEN
      v_frequency := 'instant';
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

REVOKE ALL ON FUNCTION public.user_allows_notification(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_allows_notification(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION public.notify_followers(TEXT, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) TO service_role;
