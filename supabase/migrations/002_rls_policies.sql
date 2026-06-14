-- =============================================
-- 002_rls_policies.sql
-- =============================================

ALTER TABLE user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE education              ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience             ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Own role" ON user_roles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Public read candidates" ON candidate_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Own candidate write"    ON candidate_profiles FOR ALL   USING (user_id = auth.uid());

CREATE POLICY "Public read companies"  ON company_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Own company write"      ON company_profiles FOR ALL   USING (user_id = auth.uid());

CREATE POLICY "Own education" ON education FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "Own experience" ON experience FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "Own certs" ON certifications FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "Own skills" ON skills FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "Own languages" ON languages FOR ALL USING (candidate_id = auth.uid());

CREATE POLICY "Public read education" ON education FOR SELECT USING (TRUE);
CREATE POLICY "Public read experience" ON experience FOR SELECT USING (TRUE);
CREATE POLICY "Public read certs" ON certifications FOR SELECT USING (TRUE);
CREATE POLICY "Public read skills" ON skills FOR SELECT USING (TRUE);
CREATE POLICY "Public read languages" ON languages FOR SELECT USING (TRUE);

CREATE POLICY "Public read jobs" ON jobs FOR SELECT USING (status = 'active');
CREATE POLICY "Company manage jobs" ON jobs FOR ALL USING (company_id = auth.uid());

CREATE POLICY "Candidate insert app" ON applications FOR INSERT WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Candidate read own apps" ON applications FOR SELECT USING (candidate_id = auth.uid());
CREATE POLICY "Company read apps" ON applications FOR SELECT
  USING (job_id IN (SELECT id FROM jobs WHERE company_id = auth.uid()));
CREATE POLICY "Company update app status" ON applications FOR UPDATE
  USING (job_id IN (SELECT id FROM jobs WHERE company_id = auth.uid()));

CREATE POLICY "Public read posts" ON posts FOR SELECT USING (TRUE);
CREATE POLICY "Auth insert posts" ON posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Own delete posts" ON posts FOR DELETE USING (author_id = auth.uid());

CREATE POLICY "Own notifications" ON notifications FOR ALL USING (recipient_id = auth.uid());

CREATE POLICY "Company insert verification" ON verification_requests
  FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "Company read own verification" ON verification_requests
  FOR SELECT USING (company_id = auth.uid());
CREATE POLICY "Admin all verification" ON verification_requests
  FOR ALL USING (get_my_role() = 'admin');
