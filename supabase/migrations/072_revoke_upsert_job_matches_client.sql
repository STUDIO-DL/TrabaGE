-- 072_revoke_upsert_job_matches_client.sql
-- Job match persistence is server-side only (edge worker / service role).
-- Matches the upsert_job_candidate_matches grant pattern from 058_matching_engine_v1.

REVOKE EXECUTE ON FUNCTION public.upsert_job_matches(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_job_matches(JSONB) TO service_role;
