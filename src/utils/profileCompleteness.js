function hasText(value, minLength = 1) {
  return String(value ?? '').trim().length >= minLength;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasCurrentOrEndedRange(item) {
  return Boolean(item?.start_date) && (Boolean(item?.end_date) || item?.is_current === true);
}

export function getCandidateCompletenessDetails(profile) {
  const skills = asArray(profile?.skills);
  const experience = asArray(profile?.experience);
  const education = asArray(profile?.education);
  const languages = asArray(profile?.languages);
  const certifications = asArray(profile?.certifications);
  const portfolioLinks = asArray(profile?.candidate_links);

  const basicChecks = [
    hasText(profile?.full_name),
    hasText(profile?.headline, 6),
    hasText(profile?.about, 30),
    hasText(profile?.city),
    hasText(profile?.avatar_path || profile?.avatar_url),
  ];

  const advancedChecks = [
    skills.length >= 3,
    experience.some((item) => hasText(item?.position) && hasText(item?.company) && hasCurrentOrEndedRange(item)),
    education.some((item) => hasText(item?.institution) && hasText(item?.program || item?.specialty)),
    languages.length >= 1,
    certifications.length >= 1,
    portfolioLinks.length >= 1,
    Boolean(profile?.job_preferences?.availability || profile?.job_preferences?.preferred_work_modes?.length),
  ];

  const basicPassed = basicChecks.filter(Boolean).length;
  const advancedPassed = advancedChecks.filter(Boolean).length;

  let level = 'basic';
  if (basicPassed >= 4 && advancedPassed >= 2) level = 'partial';
  if (basicPassed === basicChecks.length && advancedPassed >= 5) level = 'complete';

  return { level, basicPassed, advancedPassed };
}

export function getCandidateCompletenessWeight(profile) {
  const { level } = getCandidateCompletenessDetails(profile);
  if (level === 'complete') return 1;
  if (level === 'partial') return 0.5;
  return 0;
}

export function compareCandidateCompleteness(a, b) {
  const weightA = getCandidateCompletenessWeight(a);
  const weightB = getCandidateCompletenessWeight(b);
  return weightB - weightA;
}
