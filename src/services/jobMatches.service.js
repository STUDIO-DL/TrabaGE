import { supabase } from '../config/supabase';
import { calculateJobMatch, MATCH_THRESHOLD } from '../utils/calculateJobMatch';
import { jobsService } from './jobs.service';
import { profileService } from './profile.service';
import { followsService, FOLLOWS_TARGET } from './follows.service';
import { applicationsService } from './applications.service';
import { reportError } from '../utils/logger';

async function buildCandidateProfile(userId) {
  const [profileResult, followsResult, applicationsResult] = await Promise.all([
    profileService.getCandidateFullProfile(userId),
    followsService.getFollowing(userId, FOLLOWS_TARGET.BUSINESS),
    applicationsService.getCandidateApplications(userId),
  ]);

  if (profileResult.error) return { profile: null, error: profileResult.error };

  return {
    profile: {
      ...profileResult.data,
      followed_company_ids: (followsResult.data ?? []).map((row) => row.target_id),
      application_history: applicationsResult.data ?? [],
    },
    error: null,
  };
}

export const jobMatchesService = {
  upsertMatch: (userId, jobId, score) =>
    supabase.rpc('upsert_job_match', {
      p_user_id: userId,
      p_job_id: jobId,
      p_score: score,
    }),

  upsertCandidateMatches: (matches) =>
    supabase.rpc('upsert_job_candidate_matches', {
      p_matches: matches,
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

  getRankedJobsForCandidate: (userId, { minScore = 1, limit = 50 } = {}) =>
    supabase.rpc('get_ranked_jobs_for_candidate', {
      p_user_id: userId,
      p_limit: limit,
      p_min_score: minScore,
    }),

  getRankedCandidatesForJob: (jobId, { minScore = 1, limit = 50 } = {}) =>
    supabase.rpc('get_ranked_candidates_for_job', {
      p_job_id: jobId,
      p_limit: limit,
      p_min_score: minScore,
    }),

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

  cacheJobCandidateScores: async (job, candidates) => {
    const matches = candidates
      .map((candidate) => ({
        job_id: job.id,
        candidate_id: candidate.user_id,
        score: calculateJobMatch(candidate, job),
      }))
      .filter((item) => item.score > 0);

    if (!matches.length) return { data: [], error: null };

    const { data, error } = await jobMatchesService.upsertCandidateMatches(matches);
    if (error) {
      reportError(error, { area: 'cache_job_candidate_scores', jobId: job.id });
    }
    return { data: matches, error };
  },

  recalculateForCandidate: async (userId) => {
    const { profile, error: profileError } = await buildCandidateProfile(userId);
    if (profileError) return { data: null, error: profileError };

    const { data: jobs, error: jobsError } = await jobsService.getActiveJobs();
    if (jobsError) return { data: null, error: jobsError };

    return jobMatchesService.cacheUserJobScores(userId, jobs ?? [], profile);
  },

  recalculateForJob: async (jobId) => {
    const { data: job, error: jobError } = await jobsService.getJobById(jobId);
    if (jobError || !job) return { data: null, error: jobError };

    const { data: candidates, error: candidatesError } = await supabase
      .from('candidate_profiles')
      .select('user_id, full_name, headline, about, city, province, country, years_experience, expected_salary, job_preferences, skills(name), experience(position, company, description, start_date, end_date), education(institution, program, specialty, grade), languages(language, level), certifications(id), candidate_links(id)')
      .eq('is_active', true)
      .eq('setup_complete', true);

    if (candidatesError) return { data: null, error: candidatesError };

    const jobMatches = (candidates ?? [])
      .map((candidate) => ({
        user_id: candidate.user_id,
        job_id: jobId,
        score: calculateJobMatch(candidate, job),
      }))
      .filter((item) => item.score >= MATCH_THRESHOLD);

    if (jobMatches.length) {
      await supabase.rpc('upsert_job_matches', { p_matches: jobMatches });
    }

    await jobMatchesService.cacheJobCandidateScores(job, candidates ?? []);

    return { data: { jobMatches, candidateCount: candidates?.length ?? 0 }, error: null };
  },
};

export { MATCH_THRESHOLD, calculateJobMatch };
