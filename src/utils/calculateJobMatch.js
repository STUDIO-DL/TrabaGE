import { normalizeJobPreferences } from '../constants/jobPreferences';
import { SCORE_WEIGHTS, MATCH_THRESHOLD } from '../constants/recommendationPreferences';
import { getCandidateCompletenessWeight } from './profileCompleteness';
import {
  countEquivalentMatches,
  ROLE_EQUIVALENCE_GROUPS,
} from '../constants/matchingEquivalences';
import { normalizeText, tokenize, uniqueTokens } from './matchingTokens';
import { parseRequirements } from './jobParsing';

export { MATCH_THRESHOLD };

const EXPERIENCE_KEYWORDS = {
  none: ['sin experiencia', 'no experience', 'entry level', 'primer empleo'],
  junior: ['junior', '1 año', '1-2', '0-2', 'recién graduado'],
  mid: ['intermedio', 'mid', '2-5', '3-5', '3 años', '4 años', '5 años'],
  senior: ['senior', '5+', '6+', '7+', '8+', 'experiencia avanzada', 'lead'],
};

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

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function extractSkillName(item) {
  return item?.name || item?.skill || item;
}

function extractLanguageName(item) {
  return item?.name || item?.language || item;
}

function extractEducationText(item) {
  return [item?.degree, item?.field, item?.program, item?.grade, item?.institution]
    .filter(Boolean)
    .join(' ');
}

function inferEducationLevelFromText(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (/(master|maestr|posgrado|postgrado|mba)/.test(text)) return 'master';
  if (/(licenci|grado|universit|ingenier|bachelor)/.test(text)) return 'degree';
  if (/(tecnico|técnico|fp|formacion profesional)/.test(text)) return 'technical';
  if (/(bachiller|secundaria)/.test(text)) return 'secondary';
  return null;
}

function educationMeetsRequirement(userLevel, requiredLevel) {
  if (!requiredLevel) return false;
  if (!userLevel) return false;
  const order = ['secondary', 'technical', 'degree', 'master'];
  const userIndex = order.indexOf(userLevel);
  const requiredIndex = order.indexOf(requiredLevel);
  return userIndex >= 0 && requiredIndex >= 0 && userIndex >= requiredIndex;
}

function extractSalaryNumber(value) {
  if (value == null) return null;
  const numbers = String(value)
    .match(/\d[\d.,]*/g)
    ?.map((item) => Number(item.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')))
    .filter((item) => Number.isFinite(item));

  if (!numbers?.length) return null;
  return Math.max(...numbers);
}

function scoreRatio(matches, total, weight) {
  if (!total) return 0;
  return Math.round(Math.min(1, matches / total) * weight);
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

  // Do not penalize exceeding minimum experience.
  return userIndex >= jobIndex;
}

export function extractUserKeywords(user) {
  const prefs = normalizeJobPreferences(user?.job_preferences);
  const skillNames = (user?.skills ?? []).map(extractSkillName).filter(Boolean);
  const experienceTitles = (user?.experience ?? []).map((item) => item.position).filter(Boolean);
  const educationText = (user?.education ?? []).map(extractEducationText).filter(Boolean);
  const languages = (user?.languages ?? []).map(extractLanguageName).filter(Boolean);

  return uniqueTokens(
    tokenize(
      [
        user?.headline,
        user?.about,
        ...skillNames,
        ...experienceTitles,
        ...educationText,
        ...languages,
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
        asList(job.required_skills).join(' '),
        job.category,
        job.sector,
        job.education_level,
        asList(job.required_languages).join(' '),
        Array.isArray(requirements) ? requirements.join(' ') : job.requirements,
        job.company_profiles?.sector,
      ].join(' '),
    ),
  );
}

function extractUserRoleTokens(user) {
  const prefs = normalizeJobPreferences(user?.job_preferences);
  const positions = (user?.experience ?? []).map((item) => item.position).filter(Boolean);

  return uniqueTokens(
    tokenize([user?.headline, ...positions, ...prefs.keywords].filter(Boolean).join(' ')),
  );
}

function extractJobRoleTokens(job) {
  return uniqueTokens(tokenize([job.title, job.category, job.sector].filter(Boolean).join(' ')));
}

function roleScore(user, job) {
  const userRoleTokens = extractUserRoleTokens(user);
  const jobRoleTokens = extractJobRoleTokens(job);
  if (!userRoleTokens.length || !jobRoleTokens.length) return 0;

  const roleMap = new Map();
  ROLE_EQUIVALENCE_GROUPS.forEach((group) => {
    const normalized = group.map((item) => item.toLowerCase().trim());
    normalized.forEach((token) => {
      if (!roleMap.has(token)) roleMap.set(token, new Set());
      normalized.forEach((alias) => roleMap.get(token).add(alias));
    });
  });

  const matches = countEquivalentMatches(userRoleTokens, jobRoleTokens, roleMap);
  const directTitleMatch = userRoleTokens.some((token) => jobRoleTokens.includes(token));
  const bonus = directTitleMatch ? 0.15 : 0;

  return scoreRatio(matches + bonus, Math.max(jobRoleTokens.length, 1), SCORE_WEIGHTS.role);
}

function skillScore(user, job) {
  const userSkills = uniqueTokens((user?.skills ?? []).map(extractSkillName).flatMap(tokenize));
  const userKeywords = extractUserKeywords(user);
  const requiredSkills = uniqueTokens([
    ...asList(job.required_skills).flatMap(tokenize),
    ...parseRequirements(job.requirements).flatMap(tokenize),
    ...tokenize(job.title),
  ]);

  const jobKeywords = requiredSkills.length ? requiredSkills : extractJobKeywords(job);
  if (!userKeywords.length && !userSkills.length) return 0;
  if (!jobKeywords.length) return 0;

  const equivMatches = countEquivalentMatches(
    [...userSkills, ...userKeywords],
    jobKeywords,
  );

  if (requiredSkills.length) {
    return scoreRatio(equivMatches, requiredSkills.length, SCORE_WEIGHTS.skills);
  }

  const directMatches = userKeywords.filter((keyword) => jobKeywords.includes(keyword)).length;
  return scoreRatio(directMatches + equivMatches * 0.5, Math.max(jobKeywords.length, 1), SCORE_WEIGHTS.skills);
}

function experienceScore(user, job) {
  const userLevel = resolveUserExperienceLevel(user);
  const jobLevel = job.experience_level || inferJobExperienceLevel(job);
  if (!jobLevel) return 0;
  return experienceLevelsCompatible(userLevel, jobLevel) ? SCORE_WEIGHTS.experience : 0;
}

function locationScore(user, job, prefs) {
  if (job.work_mode === 'remote') {
    return Math.round(SCORE_WEIGHTS.location * 0.2);
  }

  const locations = prefs.preferred_locations.length
    ? prefs.preferred_locations
    : prefs.preferred_cities;
  const preferred = locations.map(normalizeText);
  const userCity = normalizeText(user?.city);
  const userProvince = normalizeText(user?.province);
  const userCountry = normalizeText(user?.country);
  const jobCity = normalizeText(job.city);
  const jobProvince = normalizeText(job.province);
  const jobCountry = normalizeText(job.country || job.company_profiles?.country);

  if (jobCity && (preferred.includes(jobCity) || userCity === jobCity)) {
    return SCORE_WEIGHTS.location;
  }
  if (jobProvince && userProvince && jobProvince === userProvince) {
    return Math.round(SCORE_WEIGHTS.location * 0.75);
  }
  if (jobCountry && userCountry && jobCountry === userCountry) {
    return Math.round(SCORE_WEIGHTS.location * 0.5);
  }
  return 0;
}

function workModeScore(job, prefs) {
  let score = 0;
  if (prefs.preferred_work_modes.length && job.work_mode && prefs.preferred_work_modes.includes(job.work_mode)) {
    score += 6;
  }
  if (
    prefs.preferred_job_types.length &&
    job.job_type &&
    prefs.preferred_job_types.includes(job.job_type)
  ) {
    score += 4;
  }
  return Math.min(SCORE_WEIGHTS.workMode, score);
}

function availabilityScore(user, job, prefs) {
  const userAvailability = prefs.availability;
  const jobAvailability = job.availability_required || 'flexible';
  if (!userAvailability) return 0;

  if (jobAvailability === 'flexible') return Math.round(SCORE_WEIGHTS.availability * 0.6);
  if (userAvailability === jobAvailability) return SCORE_WEIGHTS.availability;
  if (userAvailability === 'immediate' && jobAvailability === '30_days') {
    return Math.round(SCORE_WEIGHTS.availability * 0.7);
  }
  if (userAvailability === '30_days' && jobAvailability === 'immediate') {
    return Math.round(SCORE_WEIGHTS.availability * 0.4);
  }
  return 0;
}

function languageScore(user, job, prefs) {
  const requiredLanguages = asList(job.required_languages).map(normalizeText);
  if (!requiredLanguages.length) return 0;

  const userLanguages = new Set(
    [...(user?.languages ?? []).map(extractLanguageName), ...prefs.languages]
      .filter(Boolean)
      .map(normalizeText),
  );

  const matches = requiredLanguages.filter((language) => userLanguages.has(language)).length;
  return scoreRatio(matches, requiredLanguages.length, SCORE_WEIGHTS.languages);
}

function educationScore(user, job, prefs) {
  const requiredEducation = job.education_level || inferEducationLevelFromText(job.description);
  if (!requiredEducation) return 0;

  const userEducationLevel =
    prefs.education_level ||
    (user?.education ?? []).map(extractEducationText).map(inferEducationLevelFromText).find(Boolean);

  return educationMeetsRequirement(userEducationLevel, requiredEducation)
    ? SCORE_WEIGHTS.education
    : 0;
}

function preferenceScore(user, job, prefs) {
  let score = 0;
  const categories = prefs.preferred_categories.length
    ? prefs.preferred_categories
    : prefs.preferred_sectors;
  const sector = job.sector || job.company_profiles?.sector;
  if (categories.length && sector && categories.includes(sector)) score += 2;

  const expectedSalary = extractSalaryNumber(prefs.expected_salary || user?.expected_salary);
  const jobSalary = extractSalaryNumber(job.salary);
  if (job.salary_negotiable || (expectedSalary && jobSalary && jobSalary >= expectedSalary)) {
    score += 1;
  }

  return Math.min(3, score);
}

function recentActivityScore(user, job) {
  let score = 0;
  if (user?.followed_company_ids?.includes(job.company_id)) score += 3;

  const applicationHistory = user?.application_history ?? [];
  const sector = job.sector || job.company_profiles?.sector;
  const hasRelatedApplication = applicationHistory.some((application) => {
    const appliedSector = application.jobs?.company_profiles?.sector || application.company_sector;
    const appliedTitle = application.jobs?.title || application.job_title;
    return (
      (sector && appliedSector === sector) ||
      extractJobKeywords(job).some((keyword) => tokenize(appliedTitle).includes(keyword))
    );
  });
  if (hasRelatedApplication) score += 2;

  return Math.min(SCORE_WEIGHTS.recentActivity, score);
}

function profileCompletenessBoost(user) {
  const weight = getCandidateCompletenessWeight(user);
  if (weight >= 1) return 2;
  if (weight >= 0.5) return 1;
  return 0;
}

/**
 * Deterministic job↔candidate relevance score (0–100, internal only).
 * Swap implementation later (embeddings/AI) without changing callers.
 */
export function calculateJobMatch(user, job) {
  if (!user || !job) return 0;

  const prefs = normalizeJobPreferences(user.job_preferences);
  let score = 0;

  score += roleScore(user, job);
  score += skillScore(user, job);
  score += experienceScore(user, job);
  score += locationScore(user, job, prefs);
  score += workModeScore(job, prefs);
  score += availabilityScore(user, job, prefs);
  score += languageScore(user, job, prefs);
  score += educationScore(user, job, prefs);
  score += preferenceScore(user, job, prefs);
  score += recentActivityScore(user, job);
  score += profileCompletenessBoost(user);

  return Math.min(100, Math.max(0, score));
}

export function rankItemsByMatchScore(items, userProfile, getJobFromItem = (item) => item) {
  return [...items]
    .map((item) => ({
      item,
      score: calculateJobMatch(userProfile, getJobFromItem(item)),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(getJobFromItem(b.item)?.created_at ?? 0) -
          new Date(getJobFromItem(a.item)?.created_at ?? 0),
    );
}
