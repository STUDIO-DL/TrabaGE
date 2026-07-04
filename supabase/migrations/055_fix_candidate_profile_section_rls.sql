-- =============================================
-- 055_fix_candidate_profile_section_rls.sql
-- Ensure candidate profile sections use user_id and owners can read/write their data.
-- =============================================

-- Standardize subtable owner column (safe to replay).
DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'education',
    'experience',
    'certifications',
    'skills',
    'services',
    'languages'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table_name
        AND column_name = 'candidate_id'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table_name
        AND column_name = 'user_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN candidate_id TO user_id', v_table_name);
    END IF;
  END LOOP;
END $$;

-- Remove legacy split policies that can survive partial migrations.
DROP POLICY IF EXISTS "Own education insert" ON public.education;
DROP POLICY IF EXISTS "Own education update" ON public.education;
DROP POLICY IF EXISTS "Own education delete" ON public.education;
DROP POLICY IF EXISTS "Own education" ON public.education;

DROP POLICY IF EXISTS "Own experience insert" ON public.experience;
DROP POLICY IF EXISTS "Own experience update" ON public.experience;
DROP POLICY IF EXISTS "Own experience delete" ON public.experience;
DROP POLICY IF EXISTS "Own experience" ON public.experience;

DROP POLICY IF EXISTS "Own certs insert" ON public.certifications;
DROP POLICY IF EXISTS "Own certs update" ON public.certifications;
DROP POLICY IF EXISTS "Own certs delete" ON public.certifications;
DROP POLICY IF EXISTS "Own certs" ON public.certifications;

DROP POLICY IF EXISTS "Own skills insert" ON public.skills;
DROP POLICY IF EXISTS "Own skills delete" ON public.skills;
DROP POLICY IF EXISTS "Own skills" ON public.skills;

DROP POLICY IF EXISTS "Own services insert" ON public.services;
DROP POLICY IF EXISTS "Own services delete" ON public.services;

DROP POLICY IF EXISTS "Own languages insert" ON public.languages;
DROP POLICY IF EXISTS "Own languages update" ON public.languages;
DROP POLICY IF EXISTS "Own languages delete" ON public.languages;
DROP POLICY IF EXISTS "Own languages" ON public.languages;

-- Owner manage policies (insert/update/delete/select own rows).
DROP POLICY IF EXISTS "Users can manage their own education records" ON public.education;
CREATE POLICY "Users can manage their own education records"
ON public.education FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own experience records" ON public.experience;
CREATE POLICY "Users can manage their own experience records"
ON public.experience FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own certification records" ON public.certifications;
CREATE POLICY "Users can manage their own certification records"
ON public.certifications FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own skill records" ON public.skills;
CREATE POLICY "Users can manage their own skill records"
ON public.skills FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own service records" ON public.services;
CREATE POLICY "Users can manage their own service records"
ON public.services FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own language records" ON public.languages;
CREATE POLICY "Users can manage their own language records"
ON public.languages FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Active profile visibility for other authenticated users.
DROP POLICY IF EXISTS "Authenticated users can view education of active profiles" ON public.education;
CREATE POLICY "Authenticated users can view education of active profiles"
ON public.education FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = education.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

DROP POLICY IF EXISTS "Authenticated users can view experience of active profiles" ON public.experience;
CREATE POLICY "Authenticated users can view experience of active profiles"
ON public.experience FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = experience.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

DROP POLICY IF EXISTS "Authenticated users can view certifications of active profiles" ON public.certifications;
CREATE POLICY "Authenticated users can view certifications of active profiles"
ON public.certifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = certifications.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

DROP POLICY IF EXISTS "Authenticated users can view skills of active profiles" ON public.skills;
CREATE POLICY "Authenticated users can view skills of active profiles"
ON public.skills FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = skills.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

DROP POLICY IF EXISTS "Authenticated users can view services of active profiles" ON public.services;
CREATE POLICY "Authenticated users can view services of active profiles"
ON public.services FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = services.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

DROP POLICY IF EXISTS "Authenticated users can view languages of active profiles" ON public.languages;
CREATE POLICY "Authenticated users can view languages of active profiles"
ON public.languages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = languages.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

-- Allow owners to read their own profile row (needed for UPDATE ... RETURNING).
DROP POLICY IF EXISTS "Candidates read own profile" ON public.candidate_profiles;
CREATE POLICY "Candidates read own profile"
ON public.candidate_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());
