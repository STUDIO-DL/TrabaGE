-- =============================================
-- 048_day10_launch_blocker_fixes.sql
-- Final launch blockers: role bootstrap, CV ownership, active-role writes.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := lower(coalesce(NEW.raw_user_meta_data->>'role', 'candidate'));
BEGIN
  IF v_role NOT IN ('candidate', 'company') THEN
    v_role := 'candidate';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Own role insert" ON public.user_roles;
CREATE POLICY "Own role insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role IN ('candidate', 'company'));

CREATE OR REPLACE FUNCTION public.is_active_candidate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND ur.role = 'candidate'
      AND coalesce(cp.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_company(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.company_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND ur.role = 'company'
      AND coalesce(cp.is_active, true) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_candidate(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_candidate(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_active_company(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_active_candidate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_company(UUID) TO authenticated;

DROP POLICY IF EXISTS "Own candidate insert" ON public.candidate_profiles;
CREATE POLICY "Own candidate insert" ON public.candidate_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.get_my_role() = 'candidate');

DROP POLICY IF EXISTS "Own candidate update" ON public.candidate_profiles;
CREATE POLICY "Own candidate update" ON public.candidate_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.get_my_role() = 'candidate')
WITH CHECK (user_id = auth.uid() AND public.get_my_role() = 'candidate');

DROP POLICY IF EXISTS "Own candidate delete" ON public.candidate_profiles;
CREATE POLICY "Own candidate delete" ON public.candidate_profiles
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND public.get_my_role() = 'candidate');

DROP POLICY IF EXISTS "Own company insert" ON public.company_profiles;
CREATE POLICY "Own company insert" ON public.company_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.get_my_role() = 'company');

DROP POLICY IF EXISTS "Own company update" ON public.company_profiles;
CREATE POLICY "Own company update" ON public.company_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.get_my_role() = 'company')
WITH CHECK (user_id = auth.uid() AND public.get_my_role() = 'company');

DROP POLICY IF EXISTS "Own company delete" ON public.company_profiles;
CREATE POLICY "Own company delete" ON public.company_profiles
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND public.get_my_role() = 'company');

CREATE OR REPLACE FUNCTION public.validate_application_cv_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.cv_path IS NULL OR NEW.cv_path NOT LIKE NEW.candidate_id::text || '/%' THEN
    RAISE EXCEPTION 'Invalid CV path for this candidate';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_application_cv_path_trigger ON public.applications;
CREATE TRIGGER validate_application_cv_path_trigger
  BEFORE INSERT OR UPDATE OF candidate_id, cv_path ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_application_cv_path();

CREATE OR REPLACE FUNCTION public.get_application_cv_path(app_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cv_path TEXT;
  v_candidate_id UUID;
  v_job_company UUID;
BEGIN
  SELECT a.cv_path, a.candidate_id, j.company_id
  INTO v_cv_path, v_candidate_id, v_job_company
  FROM public.applications a
  JOIN public.jobs j ON a.job_id = j.id
  WHERE a.id = app_id;

  IF v_job_company IS DISTINCT FROM auth.uid() OR NOT public.is_active_company(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_cv_path IS NULL OR v_cv_path NOT LIKE v_candidate_id::text || '/%' THEN
    RAISE EXCEPTION 'Invalid CV path';
  END IF;

  RETURN v_cv_path;
END;
$$;

REVOKE ALL ON FUNCTION public.get_application_cv_path(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_application_cv_path(UUID) TO authenticated;

DROP POLICY IF EXISTS "Company read applicant CVs optimized" ON storage.objects;
CREATE POLICY "Company read applicant CVs optimized" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-cvs'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      WHERE j.company_id = auth.uid()
        AND public.is_active_company(auth.uid())
        AND a.cv_path = name
        AND (storage.foldername(name))[1] = a.candidate_id::text
    )
  );

DROP POLICY IF EXISTS "Company read applicant CVs legacy" ON storage.objects;

DROP POLICY IF EXISTS "Public read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Jobs are publicly viewable" ON public.jobs;
CREATE POLICY "Jobs are publicly viewable"
ON public.jobs FOR SELECT
USING (
  status = 'active'
  AND coalesce(admin_hidden, false) = false
  AND public.is_active_company(company_id)
);

DROP POLICY IF EXISTS "Company manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;
CREATE POLICY "Companies can manage their own jobs"
ON public.jobs FOR ALL TO authenticated
USING (auth.uid() = company_id AND public.is_active_company(auth.uid()))
WITH CHECK (auth.uid() = company_id AND public.is_active_company(auth.uid()));

DROP POLICY IF EXISTS "Candidate insert app" ON public.applications;
CREATE POLICY "Candidate insert app" ON public.applications
FOR INSERT TO authenticated
WITH CHECK (
  candidate_id = auth.uid()
  AND public.is_active_candidate(auth.uid())
  AND cv_path LIKE auth.uid()::text || '/%'
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_id
      AND j.status = 'active'
      AND coalesce(j.admin_hidden, false) = false
      AND public.is_active_company(j.company_id)
  )
);

DROP POLICY IF EXISTS "Candidate reapply own withdrawn apps" ON public.applications;
CREATE POLICY "Candidate reapply own withdrawn apps"
ON public.applications FOR UPDATE TO authenticated
USING (candidate_id = auth.uid() AND status = 'withdrawn' AND public.is_active_candidate(auth.uid()))
WITH CHECK (
  candidate_id = auth.uid()
  AND status = 'pending'
  AND cv_path LIKE auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Candidate read own apps" ON public.applications;
CREATE POLICY "Candidate read own apps" ON public.applications
FOR SELECT TO authenticated
USING (candidate_id = auth.uid() AND public.is_active_candidate(auth.uid()));

DROP POLICY IF EXISTS "Company read apps" ON public.applications;
CREATE POLICY "Company read apps" ON public.applications
FOR SELECT TO authenticated
USING (
  public.is_active_company(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.company_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Company update app status" ON public.applications;
CREATE POLICY "Company update app status" ON public.applications
FOR UPDATE TO authenticated
USING (
  public.is_active_company(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.company_id = auth.uid()
  )
)
WITH CHECK (
  public.is_active_company(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.company_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Auth insert posts" ON public.posts;
CREATE POLICY "Auth insert posts" ON public.posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    (author_type = 'candidate' AND public.is_active_candidate(auth.uid()))
    OR (author_type = 'company' AND public.is_active_company(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Own update posts" ON public.posts;
CREATE POLICY "Own update posts" ON public.posts
FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  AND (
    (author_type = 'candidate' AND public.is_active_candidate(auth.uid()))
    OR (author_type = 'company' AND public.is_active_company(auth.uid()))
  )
)
WITH CHECK (
  author_id = auth.uid()
  AND (
    (author_type = 'candidate' AND public.is_active_candidate(auth.uid()))
    OR (author_type = 'company' AND public.is_active_company(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Own delete posts" ON public.posts;
CREATE POLICY "Own delete posts" ON public.posts
FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  AND (
    (author_type = 'candidate' AND public.is_active_candidate(auth.uid()))
    OR (author_type = 'company' AND public.is_active_company(auth.uid()))
  )
);

CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  PERFORM public.require_admin();

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id;

  IF v_role = 'candidate' THEN
    UPDATE public.candidate_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE user_id = p_user_id;

    IF p_is_active = false THEN
      UPDATE public.posts
      SET is_hidden = true
      WHERE author_id = p_user_id;
    END IF;
  ELSIF v_role = 'company' THEN
    UPDATE public.company_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE user_id = p_user_id;

    IF p_is_active = false THEN
      UPDATE public.jobs
      SET admin_hidden = true,
          status = 'closed',
          updated_at = now()
      WHERE company_id = p_user_id;

      UPDATE public.posts
      SET is_hidden = true
      WHERE author_id = p_user_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Admin users cannot be deactivated from this action';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN) TO authenticated;
