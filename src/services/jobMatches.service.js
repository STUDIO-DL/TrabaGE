import { supabase } from '../config/supabase';
import { calculateJobMatch, MATCH_THRESHOLD } from '../utils/calculateJobMatch';
import { jobsService } from './jobs.service';
import { profileService } from './profile.service';
import { followsService, FOLLOWS_TARGET } from './follows.service';
import { applicationsService } from './applications.service';

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

    const { error } = await supabase.rpc('upsert_job_matches', {
      p_matches: matches,
    });

    if (error?.code === 'PGRST202' || error?.message?.includes('upsert_job_matches')) {
      const results = await Promise.all(
        matches.map((item) =>
          jobMatchesService.upsertMatch(item.user_id, item.job_id, item.score),
        ),
      );
      const fallbackError = results.find((result) => result.error)?.error ?? null;
      return { data: matches, error: fallbackError };
    }

    return { data: matches, error };
  },

  recalculateForCandidate: async (userId) => {
    const [profileResult, jobsResult, followsResult, applicationsResult] = await Promise.all([
      profileService.getCandidateFullProfile(userId),
      jobsService.getActiveJobs(),
      followsService.getFollowing(userId, FOLLOWS_TARGET.COMPANY),
      applicationsService.getCandidateApplications(userId),
    ]);

    if (profileResult.error || jobsResult.error) {
      return { data: null, error: profileResult.error || jobsResult.error };
    }

    const profile = {
      ...profileResult.data,
      followed_company_ids: (followsResult.data ?? []).map((row) => row.target_id),
      application_history: applicationsResult.data ?? [],
    };

    return jobMatchesService.cacheUserJobScores(userId, jobsResult.data ?? [], profile);
  },
};

export { MATCH_THRESHOLD, calculateJobMatch };
