-- 138_post_registration_onboarding.sql
-- Post-registration onboarding state for personal accounts.

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.candidate_profiles
  DROP CONSTRAINT IF EXISTS candidate_profiles_onboarding_status_check;

ALTER TABLE public.candidate_profiles
  ADD CONSTRAINT candidate_profiles_onboarding_status_check
  CHECK (onboarding_status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE public.candidate_profiles
  DROP CONSTRAINT IF EXISTS candidate_profiles_onboarding_current_step_check;

ALTER TABLE public.candidate_profiles
  ADD CONSTRAINT candidate_profiles_onboarding_current_step_check
  CHECK (onboarding_current_step BETWEEN 1 AND 8);

UPDATE public.candidate_profiles
SET
  onboarding_status = 'completed',
  onboarding_current_step = 8,
  onboarding_data = COALESCE(onboarding_data, '{}'::jsonb) || jsonb_build_object('legacy_completed', true)
WHERE setup_complete IS TRUE
  AND (onboarding_status IS NULL OR onboarding_status <> 'completed');

CREATE INDEX IF NOT EXISTS candidate_profiles_onboarding_status_idx
  ON public.candidate_profiles (onboarding_status, onboarding_current_step)
  WHERE onboarding_status <> 'completed';

ALTER TABLE public.recommendation_analytics
  DROP CONSTRAINT IF EXISTS recommendation_analytics_event_type_check;

ALTER TABLE public.recommendation_analytics
  ADD CONSTRAINT recommendation_analytics_event_type_check
  CHECK (event_type IN (
    'notification_sent',
    'notification_opened',
    'job_viewed',
    'application_submitted',
    'onboarding_screen_viewed',
    'onboarding_option_selected',
    'onboarding_skipped',
    'onboarding_back_pressed',
    'onboarding_screen_completed'
  ));

COMMENT ON COLUMN public.candidate_profiles.onboarding_status IS
  'Post-registration onboarding state for personal accounts.';

COMMENT ON COLUMN public.candidate_profiles.onboarding_current_step IS
  'Last pending post-registration onboarding step, 1-based.';

COMMENT ON COLUMN public.candidate_profiles.onboarding_data IS
  'Non-public onboarding answers used to resume and personalize recommendations.';
