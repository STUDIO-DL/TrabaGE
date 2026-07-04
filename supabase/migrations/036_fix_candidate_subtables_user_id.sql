-- =============================================
-- 036_fix_candidate_subtables_user_id.sql
-- Standardizes foreign key column to `user_id` across all candidate profile sub-tables.
-- This fixes inconsistencies where `candidate_id` was used instead of `user_id`,
-- aligning the database schema with the frontend code and RLS policies.
-- =============================================

-- Rename `candidate_id` to `user_id` in all relevant tables.
-- Guard each rename so repaired/partially migrated databases can replay safely.
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

-- Now that the column is renamed to `user_id`, update the RLS policies
-- that were created in migration 031 to use the new, correct column name.

-- education
DROP POLICY IF EXISTS "Users can manage their own education records" ON public.education;
DROP POLICY IF EXISTS "Authenticated users can view education of active profiles" ON public.education;
CREATE POLICY "Users can manage their own education records" ON public.education FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view education of active profiles" ON public.education FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = education.user_id AND cp.is_active = true));

-- experience
DROP POLICY IF EXISTS "Users can manage their own experience records" ON public.experience;
DROP POLICY IF EXISTS "Authenticated users can view experience of active profiles" ON public.experience;
CREATE POLICY "Users can manage their own experience records" ON public.experience FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view experience of active profiles" ON public.experience FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = experience.user_id AND cp.is_active = true));

-- certifications
DROP POLICY IF EXISTS "Users can manage their own certification records" ON public.certifications;
DROP POLICY IF EXISTS "Authenticated users can view certifications of active profiles" ON public.certifications;
CREATE POLICY "Users can manage their own certification records" ON public.certifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view certifications of active profiles" ON public.certifications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = certifications.user_id AND cp.is_active = true));

-- skills
DROP POLICY IF EXISTS "Users can manage their own skill records" ON public.skills;
DROP POLICY IF EXISTS "Authenticated users can view skills of active profiles" ON public.skills;
CREATE POLICY "Users can manage their own skill records" ON public.skills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view skills of active profiles" ON public.skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = skills.user_id AND cp.is_active = true));

-- services
DROP POLICY IF EXISTS "Users can manage their own service records" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can view services of active profiles" ON public.services;
CREATE POLICY "Users can manage their own service records" ON public.services FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view services of active profiles" ON public.services FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = services.user_id AND cp.is_active = true));

-- languages
DROP POLICY IF EXISTS "Users can manage their own language records" ON public.languages;
DROP POLICY IF EXISTS "Authenticated users can view languages of active profiles" ON public.languages;
CREATE POLICY "Users can manage their own language records" ON public.languages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view languages of active profiles" ON public.languages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = languages.user_id AND cp.is_active = true));