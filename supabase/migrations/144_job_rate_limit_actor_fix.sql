-- =============================================
-- 144_job_rate_limit_actor_fix.sql
-- Count job publish rate limits by the real actor.
-- =============================================

CREATE OR REPLACE FUNCTION public.enforce_write_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    PERFORM public.assert_rate_limit(NEW.author_id, 'post:create', 10, interval '10 minutes');
  ELSIF TG_TABLE_NAME = 'applications' THEN
    PERFORM public.assert_rate_limit(NEW.candidate_id, 'application:create', 20, interval '1 hour');
  ELSIF TG_TABLE_NAME = 'follows' THEN
    PERFORM public.assert_rate_limit(NEW.user_id, 'follow:create', 60, interval '1 hour');
  ELSIF TG_TABLE_NAME = 'reports' THEN
    PERFORM public.assert_rate_limit(NEW.reporter_id, 'report:create', 10, interval '1 hour');
  ELSIF TG_TABLE_NAME = 'jobs' THEN
    PERFORM public.assert_rate_limit(
      COALESCE(NEW.company_id, NEW.shared_by_user_id),
      'job:create',
      20,
      interval '1 hour'
    );
  ELSIF TG_TABLE_NAME = 'verification_requests' THEN
    PERFORM public.assert_rate_limit(NEW.company_id, 'verification:create', 3, interval '1 day');
  END IF;

  RETURN NEW;
END;
$$;
