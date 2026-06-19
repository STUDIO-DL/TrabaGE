import { hasJobPreferences, normalizeJobPreferences } from '../constants/jobPreferences';
import { MATCH_THRESHOLD } from '../constants/recommendationPreferences';
import { calculateJobMatch } from './calculateJobMatch';

export { calculateJobMatch, MATCH_THRESHOLD };

export function scoreJobMatch(job, rawPreferences, skillNames = [], userProfile = null) {
  const user = userProfile ?? {
    job_preferences: rawPreferences,
    skills: skillNames.map((name) => ({ name })),
  };

  return calculateJobMatch(user, job);
}

export function rankJobsByMatchScore(jobs, userProfile) {
  return [...jobs]
    .map((job) => ({ job, score: calculateJobMatch(userProfile, job) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.job.created_at) - new Date(a.job.created_at));
}

export function getRecommendedJobs(jobs, userProfile, { minScore = 1 } = {}) {
  return rankJobsByMatchScore(jobs, userProfile)
    .filter(({ score }) => score >= minScore)
    .map(({ job, score }) => ({ job, score }));
}

export function applyJobRecommendations(
  jobs,
  rawPreferences,
  skillNames = [],
  { query = '', filters = {}, userProfile = null } = {},
) {
  const hasManualSearch =
    Boolean(query?.trim()) || Boolean(filters?.city) || Boolean(filters?.jobType);

  const profile = userProfile ?? {
    job_preferences: rawPreferences,
    skills: skillNames.map((name) => ({ name })),
  };

  if (hasManualSearch) {
    return { jobs, mode: 'search', scoredJobs: [] };
  }

  if (!hasJobPreferences(rawPreferences) && !profile?.headline && !profile?.skills?.length) {
    return { jobs, mode: 'all', scoredJobs: [] };
  }

  const scoredJobs = getRecommendedJobs(jobs, profile);
  if (scoredJobs.length > 0) {
    return {
      jobs: scoredJobs.map(({ job }) => job),
      scoredJobs,
      mode: 'recommended',
    };
  }

  return { jobs, mode: 'fallback', scoredJobs: [] };
}

export function meetsNotificationThreshold(score) {
  return score >= MATCH_THRESHOLD;
}

// Legacy export for existing imports
export function rankJobsByPreferences(jobs, rawPreferences, skillNames = []) {
  const profile = {
    job_preferences: normalizeJobPreferences(rawPreferences),
    skills: skillNames.map((name) => ({ name })),
  };
  return getRecommendedJobs(jobs, profile).map(({ job }) => job);
}
