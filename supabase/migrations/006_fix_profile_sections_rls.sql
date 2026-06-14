-- =============================================
-- 006_fix_profile_sections_rls.sql
-- Explicit INSERT/UPDATE policies for profile sections
-- =============================================

-- education
DROP POLICY IF EXISTS "Own education" ON education;
CREATE POLICY "Own education insert" ON education FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own education update" ON education FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own education delete" ON education FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- experience
DROP POLICY IF EXISTS "Own experience" ON experience;
CREATE POLICY "Own experience insert" ON experience FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own experience update" ON experience FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own experience delete" ON experience FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- certifications
DROP POLICY IF EXISTS "Own certs" ON certifications;
CREATE POLICY "Own certs insert" ON certifications FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own certs update" ON certifications FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own certs delete" ON certifications FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- skills
DROP POLICY IF EXISTS "Own skills" ON skills;
CREATE POLICY "Own skills insert" ON skills FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own skills delete" ON skills FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- languages
DROP POLICY IF EXISTS "Own languages" ON languages;
CREATE POLICY "Own languages insert" ON languages FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own languages update" ON languages FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own languages delete" ON languages FOR DELETE TO authenticated USING (candidate_id = auth.uid());
