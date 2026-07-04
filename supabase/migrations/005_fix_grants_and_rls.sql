-- =============================================
-- 005_fix_grants_and_rls.sql
-- Fix "permission denied for table" on authenticated writes
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- candidate_profiles: explicit write policies with WITH CHECK for INSERT/upsert
DROP POLICY IF EXISTS "Own candidate write" ON candidate_profiles;
DROP POLICY IF EXISTS "Own candidate insert" ON candidate_profiles;
DROP POLICY IF EXISTS "Own candidate update" ON candidate_profiles;
DROP POLICY IF EXISTS "Own candidate delete" ON candidate_profiles;

CREATE POLICY "Own candidate insert" ON candidate_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own candidate update" ON candidate_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own candidate delete" ON candidate_profiles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- company_profiles
DROP POLICY IF EXISTS "Own company write" ON company_profiles;
DROP POLICY IF EXISTS "Own company insert" ON company_profiles;
DROP POLICY IF EXISTS "Own company update" ON company_profiles;
DROP POLICY IF EXISTS "Own company delete" ON company_profiles;

CREATE POLICY "Own company insert" ON company_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own company update" ON company_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own company delete" ON company_profiles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- user_roles: allow account-type selection upsert
DROP POLICY IF EXISTS "Own role insert" ON user_roles;
CREATE POLICY "Own role insert" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');

DROP POLICY IF EXISTS "Own role update" ON user_roles;
CREATE POLICY "Own role update" ON user_roles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');
