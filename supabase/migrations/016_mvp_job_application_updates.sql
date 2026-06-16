-- =============================================
-- 016_mvp_job_application_updates.sql
-- Job posting fields, draft status, hired status, company CV access
-- =============================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode TEXT
  CHECK (work_mode IS NULL OR work_mode IN ('on-site', 'remote', 'hybrid'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_negotiable BOOLEAN DEFAULT FALSE;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_deadline DATE;

-- Allow draft jobs alongside active/paused/closed
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'closed'));

-- Allow hired application status
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired'));

-- Companies can read application CV files they own access to
DROP POLICY IF EXISTS "Company read applicant CVs" ON storage.objects;
CREATE POLICY "Company read applicant CVs" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND EXISTS (
      SELECT 1
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = auth.uid()
        AND a.cv_url = name
    )
  );
