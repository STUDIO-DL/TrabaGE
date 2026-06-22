-- =============================================
-- 037_rls_for_jobs.sql
-- Add Row Level Security policies to the `jobs` table.
-- =============================================

-- 1. Enable RLS on the table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure this migration is idempotent
DROP POLICY IF EXISTS "Jobs are publicly viewable" ON public.jobs;
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;

-- 3. Create policies

-- Policy for SELECT:
-- Allows anyone to view active, non-hidden jobs.
CREATE POLICY "Jobs are publicly viewable"
ON public.jobs FOR SELECT
USING (status = 'active' AND admin_hidden = false);

-- Policy for INSERT, UPDATE, DELETE:
-- Allows a company user to manage jobs where `company_id` matches their own user ID.
CREATE POLICY "Companies can manage their own jobs"
ON public.jobs FOR ALL
USING (auth.uid() = company_id)
WITH CHECK (auth.uid() = company_id);

-- Policy for Admins:
-- Allows admin users to perform any action on any job.
CREATE POLICY "Admins can manage all jobs"
ON public.jobs FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));