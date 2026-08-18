-- =============================================
-- 141_shared_opportunity_owner_read.sql
-- Let personal users open their own shared opportunity immediately after publish.
-- =============================================

DROP POLICY IF EXISTS "Users can read their own shared opportunities" ON public.jobs;

CREATE POLICY "Users can read their own shared opportunities"
ON public.jobs FOR SELECT TO authenticated
USING (
  source_type = 'user'
  AND shared_by_user_id = auth.uid()
);
