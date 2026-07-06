import { hasJobPreferences, normalizeJobPreferences } from '../constants/jobPreferences';
import { MATCH_THRESHOLD } from '../constants/recommendationPreferences';
import { calculateJobMatch, rankItemsByMatchScore } from './calculateJobMatch';
import { compareCandidateCompleteness } from './profileCompleteness';

export { calculateJobMatch, MATCH_THRESHOLD };

export function scoreJobMatch(job, rawPreferences, skillNames = [], userProfile = null) {
  const user = userProfile ?? {
    job_preferences: rawPreferences,
    skills: skillNames.map((name) => ({ name })),
  };

  return calculateJobMatch(user, job);
}

export function rankJobsByMatchScore(jobs, userProfile) {
  return rankItemsByMatchScore(jobs, userProfile, (job) => job).map(({ item, score }) => ({
    job: item,
    score,
  }));
}

export function getRecommendedJobs(jobs, userProfile, { minScore = 1 } = {}) {
  return rankJobsByMatchScore(jobs, userProfile)
    .filter(({ score }) => score >= minScore);
}

function rankSearchResults(jobs, userProfile, query) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  if (!normalizedQuery) return rankJobsByMatchScore(jobs, userProfile);

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const filtered = jobs.filter((job) => {
    const haystack = [
      job.title,
      job.description,
      job.city,
      job.company_profiles?.company_name,
      ...(job.required_skills ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return queryTokens.every((token) => haystack.includes(token));
  });

  const ranked = rankJobsByMatchScore(filtered.length ? filtered : jobs, userProfile);
  return ranked.length ? ranked : rankJobsByMatchScore(jobs, userProfile);
}

export function applyJobRecommendations(
  jobs,
  rawPreferences,
  skillNames = [],
  { query = '', filters = {}, userProfile = null } = {},
) {
  const profile = userProfile ?? {
    job_preferences: normalizeJobPreferences(rawPreferences),
    skills: skillNames.map((name) => ({ name })),
  };

  const hasManualSearch =
    Boolean(query?.trim()) || Boolean(filters?.city) || Boolean(filters?.jobType);

  if (hasManualSearch) {
    const scoredJobs = rankSearchResults(jobs, profile, query);
    return {
      jobs: scoredJobs.map(({ job }) => job),
      scoredJobs,
      mode: 'search',
    };
  }

  if (!hasJobPreferences(rawPreferences) && !profile?.headline && !profile?.skills?.length) {
    return { jobs, mode: 'all', scoredJobs: rankJobsByMatchScore(jobs, profile) };
  }

  const scoredJobs = getRecommendedJobs(jobs, profile);
  if (scoredJobs.length > 0) {
    return {
      jobs: scoredJobs.map(({ job }) => job),
      scoredJobs,
      mode: 'recommended',
    };
  }

  return {
    jobs,
    mode: 'fallback',
    scoredJobs: rankJobsByMatchScore(jobs, profile),
  };
}

export function rankCandidatesForJob(candidates, job) {
  return [...candidates]
    .map((candidate) => ({
      candidate,
      score: calculateJobMatch(candidate, job),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        compareCandidateCompleteness(a.candidate, b.candidate),
    );
}

export function rankApplicantsByJob(applicants, getCandidate = (row) => row.candidate_profiles, getJob = (row) => row.jobs) {
  return [...applicants]
    .map((application) => {
      const candidate = getCandidate(application);
      const job = getJob(application);
      return {
        ...application,
        applicant_match_score: calculateJobMatch(candidate, job),
      };
    })
    .sort(
      (a, b) =>
        (b.applicant_match_score ?? 0) - (a.applicant_match_score ?? 0) ||
        compareCandidateCompleteness(getCandidate(a), getCandidate(b)) ||
        new Date(b.applied_at ?? 0) - new Date(a.applied_at ?? 0),
    );
}

export function meetsNotificationThreshold(score) {
  return score >= MATCH_THRESHOLD;
}

export function rankJobsByPreferences(jobs, rawPreferences, skillNames = []) {
  const profile = {
    job_preferences: normalizeJobPreferences(rawPreferences),
    skills: skillNames.map((name) => ({ name })),
  };
  return getRecommendedJobs(jobs, profile).map(({ job }) => job);
}
