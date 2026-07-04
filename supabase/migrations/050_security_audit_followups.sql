-- =============================================
-- 050_security_audit_followups.sql
-- Close audit P0s: immutable applications, role hopping, stale policies.
-- =============================================

CREATE OR REPLACE FUNCTION public.set_initial_user_role(p_role TEXT)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT := lower(trim(coalesce(p_role, '')));
  v_current public.user_roles;
  v_has_candidate BOOLEAN;
  v_has_company BOOLEAN;
  v_result public.user_roles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_role NOT IN ('candidate', 'company') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT * INTO v_current
  FROM public.user_roles
  WHERE user_id = v_user_id;

  SELECT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = v_user_id)
  INTO v_has_candidate;

  SELECT EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = v_user_id)
  INTO v_has_company;

  IF v_has_candidate AND v_has_company THEN
    RAISE EXCEPTION 'Account has multiple profile types';
  END IF;

  IF v_has_candidate AND v_role <> 'candidate' THEN
    RAISE EXCEPTION 'Role already bound to candidate profile';
  END IF;

  IF v_has_company AND v_role <> 'company' THEN
    RAISE EXCEPTION 'Role already bound to company profile';
  END IF;

  IF v_current.user_id IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_role)
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;

  IF v_current.role = 'admin' THEN
    RETURN v_current;
  END IF;

  IF v_current.role = v_role THEN
    RETURN v_current;
  END IF;

  IF v_has_candidate OR v_has_company THEN
    RAISE EXCEPTION 'Role cannot be changed after profile setup';
  END IF;

  UPDATE public.user_roles
  SET role = v_role
  WHERE user_id = v_user_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_initial_user_role(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_initial_user_role(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Own role update" ON public.user_roles;
DROP POLICY IF EXISTS "Own role insert" ON public.user_roles;
CREATE POLICY "Own role insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role IN ('candidate', 'company'));

-- Remove older permissive owner policies that OR with newer role-aware policies.
DROP POLICY IF EXISTS "Candidates can manage their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Companies can manage their own profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Public read candidates" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Public read companies" ON public.company_profiles;
DROP POLICY IF EXISTS "Own candidate update" ON public.candidate_profiles;
CREATE POLICY "Own candidate update" ON public.candidate_profiles
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() = 'candidate'
  AND coalesce(is_active, true) = true
)
WITH CHECK (
  user_id = auth.uid()
  AND public.get_my_role() = 'candidate'
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own candidate delete" ON public.candidate_profiles;
CREATE POLICY "Own candidate delete" ON public.candidate_profiles
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() = 'candidate'
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own company update" ON public.company_profiles;
CREATE POLICY "Own company update" ON public.company_profiles
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() = 'company'
  AND coalesce(is_active, true) = true
)
WITH CHECK (
  user_id = auth.uid()
  AND public.get_my_role() = 'company'
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own company delete" ON public.company_profiles;
CREATE POLICY "Own company delete" ON public.company_profiles
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() = 'company'
  AND coalesce(is_active, true) = true
);

CREATE OR REPLACE FUNCTION public.prevent_dual_profile_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'candidate_profiles' THEN
    IF EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'A user cannot have both candidate and company profiles';
    END IF;
  ELSIF TG_TABLE_NAME = 'company_profiles' THEN
    IF EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'A user cannot have both candidate and company profiles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_dual_candidate_profile_trigger ON public.candidate_profiles;
CREATE TRIGGER prevent_dual_candidate_profile_trigger
  BEFORE INSERT ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dual_profile_types();

DROP TRIGGER IF EXISTS prevent_dual_company_profile_trigger ON public.company_profiles;
CREATE TRIGGER prevent_dual_company_profile_trigger
  BEFORE INSERT ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dual_profile_types();

CREATE OR REPLACE FUNCTION public.protect_application_update_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_company_owner BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.get_my_role() = 'admin';
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = OLD.job_id
      AND j.company_id = auth.uid()
      AND public.is_active_company(auth.uid())
  ) INTO v_is_company_owner;

  IF auth.uid() = OLD.candidate_id THEN
    IF OLD.candidate_id IS DISTINCT FROM NEW.candidate_id
      OR OLD.job_id IS DISTINCT FROM NEW.job_id THEN
      RAISE EXCEPTION 'Application identity fields cannot be changed';
    END IF;

    IF OLD.status = 'withdrawn' AND NEW.status = 'pending' THEN
      IF NEW.cv_path IS NULL OR NEW.cv_path NOT LIKE auth.uid()::TEXT || '/%' THEN
        RAISE EXCEPTION 'Invalid CV path';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.status = 'withdrawn'
      AND OLD.cv_path IS NOT DISTINCT FROM NEW.cv_path
      AND OLD.cv_name IS NOT DISTINCT FROM NEW.cv_name
      AND OLD.full_name IS NOT DISTINCT FROM NEW.full_name
      AND OLD.additional_notes IS NOT DISTINCT FROM NEW.additional_notes
      AND OLD.custom_answers IS NOT DISTINCT FROM NEW.custom_answers
      AND OLD.applied_at IS NOT DISTINCT FROM NEW.applied_at THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Candidates may only withdraw or reapply withdrawn applications';
  END IF;

  IF v_is_company_owner THEN
    IF OLD.candidate_id IS DISTINCT FROM NEW.candidate_id
      OR OLD.job_id IS DISTINCT FROM NEW.job_id
      OR OLD.cv_path IS DISTINCT FROM NEW.cv_path
      OR OLD.cv_name IS DISTINCT FROM NEW.cv_name
      OR OLD.full_name IS DISTINCT FROM NEW.full_name
      OR OLD.additional_notes IS DISTINCT FROM NEW.additional_notes
      OR OLD.custom_answers IS DISTINCT FROM NEW.custom_answers
      OR OLD.applied_at IS DISTINCT FROM NEW.applied_at THEN
      RAISE EXCEPTION 'Companies may only update application status';
    END IF;

    IF NEW.status NOT IN ('pending', 'viewed', 'contacted', 'accepted', 'rejected') THEN
      RAISE EXCEPTION 'Invalid company application status';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized';
END;
$$;

DROP TRIGGER IF EXISTS protect_application_update_fields_trigger ON public.applications;
CREATE TRIGGER protect_application_update_fields_trigger
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.protect_application_update_fields();

DROP POLICY IF EXISTS "Candidate withdraw own apps" ON public.applications;
CREATE POLICY "Candidate withdraw own apps" ON public.applications
FOR UPDATE TO authenticated
USING (
  candidate_id = auth.uid()
  AND status <> 'withdrawn'
  AND public.is_active_candidate(auth.uid())
)
WITH CHECK (
  candidate_id = auth.uid()
  AND status = 'withdrawn'
);

DROP POLICY IF EXISTS "Company read applicant CVs" ON storage.objects;
DROP POLICY IF EXISTS "Company read applicant CVs legacy" ON storage.objects;
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
        AND (storage.foldername(name))[1] = a.candidate_id::TEXT
    )
  );

DROP POLICY IF EXISTS "Users manage own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users read own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users save own jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users delete own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users read own saved jobs" ON public.saved_jobs
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.is_active_candidate(auth.uid()));

CREATE POLICY "Users save own jobs" ON public.saved_jobs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_active_candidate(auth.uid()));

CREATE POLICY "Users delete own saved jobs" ON public.saved_jobs
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND public.is_active_candidate(auth.uid()));

DROP POLICY IF EXISTS "Users view own follows" ON public.follows;
DROP POLICY IF EXISTS "Users create own follows" ON public.follows;
DROP POLICY IF EXISTS "Users delete own follows" ON public.follows;
CREATE POLICY "Users view own follows" ON public.follows
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.is_active_candidate(auth.uid()));

CREATE POLICY "Users create own follows" ON public.follows
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_candidate(auth.uid())
  AND target_id <> auth.uid()
  AND (
    target_type <> 'company'
    OR public.is_active_company(target_id)
  )
);

CREATE POLICY "Users delete own follows" ON public.follows
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND public.is_active_candidate(auth.uid()));

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users read own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND (
    public.is_active_candidate(auth.uid())
    OR public.is_active_company(auth.uid())
  )
);

CREATE POLICY "Users read own reports" ON public.reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Candidate CV delete own" ON storage.objects;
DROP POLICY IF EXISTS "Candidate CV upload own" ON storage.objects;
CREATE POLICY "Candidate CV upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-cvs'
    AND name = auth.uid()::TEXT || '/cv.pdf'
    AND public.is_active_candidate(auth.uid())
    AND metadata->>'mimetype' = 'application/pdf'
    AND (metadata->>'size')::BIGINT <= 5242880
  );

DROP POLICY IF EXISTS "Candidate CV update own" ON storage.objects;
CREATE POLICY "Candidate CV update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-cvs'
    AND name = auth.uid()::TEXT || '/cv.pdf'
    AND public.is_active_candidate(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'candidate-cvs'
    AND name = auth.uid()::TEXT || '/cv.pdf'
    AND public.is_active_candidate(auth.uid())
    AND metadata->>'mimetype' = 'application/pdf'
    AND (metadata->>'size')::BIGINT <= 5242880
  );

CREATE POLICY "Candidate CV delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-cvs'
    AND name = auth.uid()::TEXT || '/cv.pdf'
    AND public.is_active_candidate(auth.uid())
  );

DROP POLICY IF EXISTS "Candidate avatar delete own" ON storage.objects;
DROP POLICY IF EXISTS "Candidate avatar upload own" ON storage.objects;
CREATE POLICY "Candidate avatar upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/avatar.webp'
    AND public.is_active_candidate(auth.uid())
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 2097152
  );

DROP POLICY IF EXISTS "Candidate avatar update own" ON storage.objects;
CREATE POLICY "Candidate avatar update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/avatar.webp'
    AND public.is_active_candidate(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/avatar.webp'
    AND public.is_active_candidate(auth.uid())
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 2097152
  );

CREATE POLICY "Candidate avatar delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/avatar.webp'
    AND public.is_active_candidate(auth.uid())
  );

DROP POLICY IF EXISTS "Logo delete own" ON storage.objects;
DROP POLICY IF EXISTS "Company logo upload own" ON storage.objects;
CREATE POLICY "Company logo upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

DROP POLICY IF EXISTS "Company logo update own" ON storage.objects;
CREATE POLICY "Company logo update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

CREATE POLICY "Logo delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
  );

DROP POLICY IF EXISTS "Post image delete own" ON storage.objects;
DROP POLICY IF EXISTS "Post image upload own" ON storage.objects;
CREATE POLICY "Post image upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(name) LIKE '%.webp'
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

DROP POLICY IF EXISTS "Post image update own" ON storage.objects;
CREATE POLICY "Post image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(name) LIKE '%.webp'
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 3145728
  );

CREATE POLICY "Post image delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
  );
