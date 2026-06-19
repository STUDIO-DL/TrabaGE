import { supabase } from '../config/supabase';
import { calculateJobMatch, MATCH_THRESHOLD } from '../utils/calculateJobMatch';

export const jobMatchesService = {
  upsertMatch: (userId, jobId, score) =>
    supabase.rpc('upsert_job_match', {
      p_user_id: userId,
      p_job_id: jobId,
      p_score: score,
    }),

  getUserMatches: (userId, { minScore = 1, limit = 50 } = {}) =>
    supabase
      .from('job_matches')
      .select('job_id, score, created_at, jobs(*, company_profiles(company_name, logo_path, verified_status, is_verified, verification_status, sector))')
      .eq('user_id', userId)
      .gte('score', minScore)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),

  cacheUserJobScores: async (userId, jobs, userProfile) => {
    const matches = jobs
      .map((job) => ({
        user_id: userId,
        job_id: job.id,
        score: calculateJobMatch(userProfile, job),
      }))
      .filter((item) => item.score > 0);

    if (!matches.length) return { data: [], error: null };

    const results = await Promise.all(
      matches.map((item) =>
        jobMatchesService.upsertMatch(item.user_id, item.job_id, item.score),
      ),
    );

    const error = results.find((result) => result.error)?.error ?? null;
    return { data: matches, error };
  },
};

export { MATCH_THRESHOLD, calculateJobMatch };
