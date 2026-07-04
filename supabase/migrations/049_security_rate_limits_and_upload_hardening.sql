-- =============================================
-- 049_security_rate_limits_and_upload_hardening.sql
-- Abuse protection, input bounds and strict upload policies.
-- =============================================

CREATE TABLE IF NOT EXISTS public.security_rate_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_rate_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS security_rate_events_actor_action_created_idx
  ON public.security_rate_events (actor_id, action, created_at DESC);

REVOKE ALL ON TABLE public.security_rate_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.security_rate_events_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_rate_limit(
  p_actor_id UUID,
  p_action TEXT,
  p_max_count INT,
  p_window INTERVAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.security_rate_events
  WHERE created_at < now() - interval '2 days';

  SELECT count(*) INTO v_count
  FROM public.security_rate_events
  WHERE actor_id = p_actor_id
    AND action = p_action
    AND created_at >= now() - p_window;

  IF v_count >= p_max_count THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  INSERT INTO public.security_rate_events (actor_id, action)
  VALUES (p_actor_id, p_action);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_rate_limit(UUID, TEXT, INT, INTERVAL) FROM PUBLIC;

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
    PERFORM public.assert_rate_limit(NEW.company_id, 'job:create', 20, interval '1 hour');
  ELSIF TG_TABLE_NAME = 'verification_requests' THEN
    PERFORM public.assert_rate_limit(NEW.company_id, 'verification:create', 3, interval '1 day');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_posts_insert ON public.posts;
CREATE TRIGGER rate_limit_posts_insert
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limits();

DROP TRIGGER IF EXISTS rate_limit_applications_insert ON public.applications;
CREATE TRIGGER rate_limit_applications_insert
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limits();

DROP TRIGGER IF EXISTS rate_limit_follows_insert ON public.follows;
CREATE TRIGGER rate_limit_follows_insert
  BEFORE INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limits();

DROP TRIGGER IF EXISTS rate_limit_reports_insert ON public.reports;
CREATE TRIGGER rate_limit_reports_insert
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limits();

DROP TRIGGER IF EXISTS rate_limit_jobs_insert ON public.jobs;
CREATE TRIGGER rate_limit_jobs_insert
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limits();

DROP TRIGGER IF EXISTS rate_limit_verification_requests_insert ON public.verification_requests;
CREATE TRIGGER rate_limit_verification_requests_insert
  BEFORE INSERT ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limits();

DROP INDEX IF EXISTS reports_one_open_per_target_per_user_idx;
CREATE UNIQUE INDEX reports_one_open_per_target_per_user_idx
  ON public.reports (reporter_id, target_type, target_id)
  WHERE status IN ('pending', 'reviewed');

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_content_length_check,
  ADD CONSTRAINT posts_content_length_check
    CHECK (char_length(trim(content)) BETWEEN 1 AND 2000) NOT VALID;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_text_length_check,
  ADD CONSTRAINT jobs_text_length_check
    CHECK (
      char_length(trim(title)) BETWEEN 1 AND 180
      AND (description IS NULL OR char_length(description) <= 5000)
      AND (requirements IS NULL OR char_length(requirements) <= 5000)
      AND (benefits IS NULL OR char_length(benefits::text) <= 5000)
    ) NOT VALID;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_text_length_check,
  ADD CONSTRAINT applications_text_length_check
    CHECK (
      char_length(trim(full_name)) BETWEEN 1 AND 180
      AND char_length(trim(cv_name)) BETWEEN 1 AND 255
      AND (additional_notes IS NULL OR char_length(additional_notes) <= 5000)
    ) NOT VALID;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reason_details_length_check,
  ADD CONSTRAINT reports_reason_details_length_check
    CHECK (reason_details IS NULL OR char_length(reason_details) <= 1200) NOT VALID;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_text_length_check,
  ADD CONSTRAINT notifications_text_length_check
    CHECK (
      char_length(trim(title)) BETWEEN 1 AND 180
      AND (body IS NULL OR char_length(body) <= 1000)
    ) NOT VALID;

DROP POLICY IF EXISTS "Candidate CV upload own" ON storage.objects;
CREATE POLICY "Candidate CV upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-cvs'
    AND name = auth.uid()::TEXT || '/cv.pdf'
    AND metadata->>'mimetype' = 'application/pdf'
    AND (metadata->>'size')::BIGINT <= 5242880
  );

DROP POLICY IF EXISTS "Candidate CV update own" ON storage.objects;
CREATE POLICY "Candidate CV update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate-cvs' AND name = auth.uid()::TEXT || '/cv.pdf')
  WITH CHECK (
    bucket_id = 'candidate-cvs'
    AND name = auth.uid()::TEXT || '/cv.pdf'
    AND metadata->>'mimetype' = 'application/pdf'
    AND (metadata->>'size')::BIGINT <= 5242880
  );

DROP POLICY IF EXISTS "Candidate avatar upload own" ON storage.objects;
CREATE POLICY "Candidate avatar upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/avatar.webp'
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 2097152
  );

DROP POLICY IF EXISTS "Candidate avatar update own" ON storage.objects;
CREATE POLICY "Candidate avatar update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate-avatars' AND name = auth.uid()::TEXT || '/avatar.webp')
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/avatar.webp'
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 2097152
  );

DROP POLICY IF EXISTS "Logo upload own" ON storage.objects;
DROP POLICY IF EXISTS "Company logo upload own" ON storage.objects;
DROP POLICY IF EXISTS "Company logo update own" ON storage.objects;
CREATE POLICY "Company logo upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

CREATE POLICY "Company logo update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

DROP POLICY IF EXISTS "Post image upload own" ON storage.objects;
DROP POLICY IF EXISTS "Post image update own" ON storage.objects;
CREATE POLICY "Post image upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(name) LIKE '%.webp'
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

CREATE POLICY "Post image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(name) LIKE '%.webp'
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

DROP POLICY IF EXISTS "Company verification upload own" ON storage.objects;
CREATE POLICY "Company verification upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-verifications'
    AND name = auth.uid()::TEXT || '/verification-document.pdf'
    AND metadata->>'mimetype' = 'application/pdf'
    AND (metadata->>'size')::BIGINT <= 5242880
  );

DROP POLICY IF EXISTS "Company verification update own" ON storage.objects;
CREATE POLICY "Company verification update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-verifications'
    AND name = auth.uid()::TEXT || '/verification-document.pdf'
    AND NOT EXISTS (
      SELECT 1
      FROM public.verification_requests vr
      WHERE vr.company_id = auth.uid()
        AND vr.verification_document_path = name
        AND vr.status IN ('pending', 'approved')
    )
  )
  WITH CHECK (
    bucket_id = 'company-verifications'
    AND name = auth.uid()::TEXT || '/verification-document.pdf'
    AND metadata->>'mimetype' = 'application/pdf'
    AND (metadata->>'size')::BIGINT <= 5242880
  );

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

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
