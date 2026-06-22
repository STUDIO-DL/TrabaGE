-- =============================================
-- 031_rls_for_candidate_profiles.sql
-- Harden Row Level Security for candidate profiles and related tables.
-- =============================================

-- Enable RLS on all related tables if not already enabled
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts and re-create them.
-- candidate_profiles
DROP POLICY IF EXISTS "Candidates can manage their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.candidate_profiles;

CREATE POLICY "Candidates can manage their own profile"
ON public.candidate_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view active profiles"
ON public.candidate_profiles FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage all profiles"
ON public.candidate_profiles FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Generic policies for related tables (education, experience, etc.)
-- This pattern ensures users can manage their own data, and others can view it if the profile is public.

-- education
DROP POLICY IF EXISTS "Users can manage their own education records" ON public.education;
DROP POLICY IF EXISTS "Authenticated users can view education of active profiles" ON public.education;
CREATE POLICY "Users can manage their own education records" ON public.education FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Authenticated users can view education of active profiles" ON public.education FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = education.candidate_id AND cp.is_active = true));

-- experience
DROP POLICY IF EXISTS "Users can manage their own experience records" ON public.experience;
DROP POLICY IF EXISTS "Authenticated users can view experience of active profiles" ON public.experience;
CREATE POLICY "Users can manage their own experience records" ON public.experience FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Authenticated users can view experience of active profiles" ON public.experience FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = experience.candidate_id AND cp.is_active = true));

-- certifications
DROP POLICY IF EXISTS "Users can manage their own certification records" ON public.certifications;
DROP POLICY IF EXISTS "Authenticated users can view certifications of active profiles" ON public.certifications;
CREATE POLICY "Users can manage their own certification records" ON public.certifications FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Authenticated users can view certifications of active profiles" ON public.certifications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = certifications.candidate_id AND cp.is_active = true));

-- skills
DROP POLICY IF EXISTS "Users can manage their own skill records" ON public.skills;
DROP POLICY IF EXISTS "Authenticated users can view skills of active profiles" ON public.skills;
CREATE POLICY "Users can manage their own skill records" ON public.skills FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Authenticated users can view skills of active profiles" ON public.skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = skills.candidate_id AND cp.is_active = true));

-- services
DROP POLICY IF EXISTS "Users can manage their own service records" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can view services of active profiles" ON public.services;
CREATE POLICY "Users can manage their own service records" ON public.services FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Authenticated users can view services of active profiles" ON public.services FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = services.candidate_id AND cp.is_active = true));

-- languages
DROP POLICY IF EXISTS "Users can manage their own language records" ON public.languages;
DROP POLICY IF EXISTS "Authenticated users can view languages of active profiles" ON public.languages;
CREATE POLICY "Users can manage their own language records" ON public.languages FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Authenticated users can view languages of active profiles" ON public.languages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = languages.candidate_id AND cp.is_active = true));