import { hasJobPreferences, normalizeJobPreferences } from '../constants/jobPreferences';

function buildJobHaystack(job) {
  return [
    job.title,
    job.description,
    job.requirements,
    job.company_profiles?.company_name,
    job.company_profiles?.sector,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function scoreJobMatch(job, rawPreferences, skillNames = []) {
  const prefs = normalizeJobPreferences(rawPreferences);
  let score = 0;

  if (prefs.preferred_cities.length && job.city && prefs.preferred_cities.includes(job.city)) {
    score += 3;
  }

  if (
    prefs.preferred_job_types.length &&
    job.job_type &&
    prefs.preferred_job_types.includes(job.job_type)
  ) {
    score += 3;
  }

  const sector = job.company_profiles?.sector;
  if (prefs.preferred_sectors.length && sector && prefs.preferred_sectors.includes(sector)) {
    score += 2;
  }

  const haystack = buildJobHaystack(job);

  for (const keyword of prefs.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 2;
  }

  for (const skill of skillNames) {
    if (haystack.includes(skill.toLowerCase())) score += 1;
  }

  return score;
}

export function rankJobsByPreferences(jobs, rawPreferences, skillNames = []) {
  return [...jobs]
    .map((job) => ({ job, score: scoreJobMatch(job, rawPreferences, skillNames) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.job.created_at) - new Date(a.job.created_at))
    .map(({ job }) => job);
}

export function applyJobRecommendations(jobs, rawPreferences, skillNames = [], { query = '', filters = {} } = {}) {
  const hasManualSearch =
    Boolean(query?.trim()) || Boolean(filters?.city) || Boolean(filters?.jobType);

  if (hasManualSearch || !hasJobPreferences(rawPreferences)) {
    return { jobs, mode: hasManualSearch ? 'search' : 'all' };
  }

  const ranked = rankJobsByPreferences(jobs, rawPreferences, skillNames);
  if (ranked.length > 0) {
    return { jobs: ranked, mode: 'recommended' };
  }

  return { jobs, mode: 'fallback' };
}
