-- =============================================
-- TrabaGE - Notification preferences v2
-- Align preference keys with notification types that actually exist in the app.
-- =============================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS employment_new_applications BOOLEAN NOT NULL DEFAULT TRUE;

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
    WHEN p_type IN ('verification_submitted', 'verification_approved', 'verification_rejected', 'company_verified') THEN 'companies_verified'
    WHEN p_type IN ('new_post', 'company_update') THEN 'activity_post_interactions'
    WHEN p_type IN ('login', 'password_changed', 'security_alert', 'account_update') THEN 'account_security'
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
    ELSE FALSE
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
