import { normalizeJobPreferences } from '../constants/jobPreferences';
import { SCORE_WEIGHTS, MATCH_THRESHOLD } from '../constants/recommendationPreferences';
import { parseRequirements } from './jobParsing';

export { MATCH_THRESHOLD };

const STOP_WORDS = new Set([
  'para',
  'con',
  'del',
  'los',
  'las',
  'una',
  'uno',
  'por',
  'que',
  'the',
  'and',
  'de',
  'en',
  'el',
  'la',
]);

const EXPERIENCE_KEYWORDS = {
  none: ['sin experiencia', 'no experience', 'entry level', 'primer empleo'],
  junior: ['junior', '1 año', '1-2', '0-2', 'recién graduado'],
  mid: ['intermedio', 'mid', '2-5', '3-5', '3 años', '4 años', '5 años'],
  senior: ['senior', '5+', '6+', '7+', '8+', 'experiencia avanzada', 'lead'],
};

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function uniqueTokens(tokens) {
  return [...new Set(tokens)];
}

function buildJobHaystack(job) {
  const requirements = parseRequirements(job.requirements);
  return [
    job.title,
    job.description,
    Array.isArray(requirements) ? requirements.join(' ') : job.requirements,
    job.company_profiles?.sector,
    job.company_profiles?.company_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function inferExperienceLevelFromYears(years) {
  if (years == null || Number.isNaN(Number(years))) return null;
  const value = Number(years);
  if (value <= 0) return 'none';
  if (value <= 2) return 'junior';
  if (value <= 5) return 'mid';
  return 'senior';
}

export function inferJobExperienceLevel(job) {
  const haystack = buildJobHaystack(job);
  for (const [level, keywords] of Object.entries(EXPERIENCE_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return level;
    }
  }
  return null;
}

function resolveUserExperienceLevel(user) {
  const prefs = normalizeJobPreferences(user?.job_preferences);
  if (prefs.experience_level) return prefs.experience_level;
  return inferExperienceLevelFromYears(user?.years_experience);
}

function experienceLevelsCompatible(userLevel, jobLevel) {
  if (!userLevel || !jobLevel) return false;
  if (userLevel === jobLevel) return true;

  const order = ['none', 'junior', 'mid', 'senior'];
  const userIndex = order.indexOf(userLevel);
  const jobIndex = order.indexOf(jobLevel);
  if (userIndex < 0 || jobIndex < 0) return false;

  return userIndex >= jobIndex;
}

export function extractUserKeywords(user) {
  const prefs = normalizeJobPreferences(user?.job_preferences);
  const skillNames = (user?.skills ?? []).map((item) => item.name).filter(Boolean);
  const experienceTitles = (user?.experience ?? []).map((item) => item.position).filter(Boolean);

  return uniqueTokens(
    tokenize(
      [
        user?.headline,
        user?.about,
        ...skillNames,
        ...experienceTitles,
        ...prefs.keywords,
      ].join(' '),
    ),
  );
}

export function extractJobKeywords(job) {
  const requirements = parseRequirements(job.requirements);
  return uniqueTokens(
    tokenize(
      [
        job.title,
        job.description,
        Array.isArray(requirements) ? requirements.join(' ') : job.requirements,
        job.company_profiles?.sector,
      ].join(' '),
    ),
  );
}

function keywordOverlapScore(userKeywords, jobKeywords) {
  if (!userKeywords.length || !jobKeywords.length) return 0;

  const jobSet = new Set(jobKeywords);
  const matches = userKeywords.filter((keyword) => jobSet.has(keyword)).length;
  const ratio = matches / Math.max(userKeywords.length, 1);

  return Math.round(Math.min(1, ratio * 2) * SCORE_WEIGHTS.keywords);
}

/**
 * Rule-based job match score (0–100). AI-ready: swap implementation without changing callers.
 */
export function calculateJobMatch(user, job) {
  if (!user || !job) return 0;

  const prefs = normalizeJobPreferences(user.job_preferences);
  let score = 0;

  const categories = prefs.preferred_categories.length
    ? prefs.preferred_categories
    : prefs.preferred_sectors;
  const sector = job.company_profiles?.sector;
  if (categories.length && sector && categories.includes(sector)) {
    score += SCORE_WEIGHTS.category;
  }

  const locations = prefs.preferred_locations.length
    ? prefs.preferred_locations
    : prefs.preferred_cities;
  if (locations.length && job.city && locations.includes(job.city)) {
    score += SCORE_WEIGHTS.location;
  }

  if (
    prefs.preferred_job_types.length &&
    job.job_type &&
    prefs.preferred_job_types.includes(job.job_type)
  ) {
    score += SCORE_WEIGHTS.jobType;
  }

  const userLevel = resolveUserExperienceLevel(user);
  const jobLevel = inferJobExperienceLevel(job);
  if (experienceLevelsCompatible(userLevel, jobLevel)) {
    score += SCORE_WEIGHTS.experience;
  }

  score += keywordOverlapScore(extractUserKeywords(user), extractJobKeywords(job));

  return Math.min(100, Math.max(0, score));
}
