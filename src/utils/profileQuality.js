function hasText(value, minLength = 1) {
  return String(value ?? '').trim().length >= minLength;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export const PROFILE_QUALITY_CODES = {
  MISSING_HEADLINE: 'missing_headline',
  SHORT_ABOUT: 'short_about',
  MISSING_LOCATION: 'missing_location',
  FEW_SKILLS: 'few_skills',
  INCOMPLETE_EXPERIENCE: 'incomplete_experience',
  NO_LANGUAGES: 'no_languages',
  NO_PORTFOLIO_LINKS: 'no_portfolio_links',
};

export function getCandidateProfileQualityIssues(profile) {
  const issues = [];

  if (!hasText(profile?.headline, 6)) {
    issues.push({
      code: PROFILE_QUALITY_CODES.MISSING_HEADLINE,
      field: 'headline',
      severity: 'medium',
      message: 'Añade un titular profesional claro.',
    });
  }

  if (!hasText(profile?.about, 60)) {
    issues.push({
      code: PROFILE_QUALITY_CODES.SHORT_ABOUT,
      field: 'about',
      severity: 'medium',
      message: 'Amplía la descripción profesional con logros y enfoque.',
    });
  }

  if (!hasText(profile?.city)) {
    issues.push({
      code: PROFILE_QUALITY_CODES.MISSING_LOCATION,
      field: 'city',
      severity: 'low',
      message: 'Completa tu ubicación para mejorar relevancia local.',
    });
  }

  if (asArray(profile?.skills).length < 3) {
    issues.push({
      code: PROFILE_QUALITY_CODES.FEW_SKILLS,
      field: 'skills',
      severity: 'high',
      message: 'Incluye al menos 3 habilidades clave.',
    });
  }

  const hasCompleteExperience = asArray(profile?.experience).some(
    (item) =>
      hasText(item?.position) &&
      hasText(item?.company) &&
      hasText(item?.description, 20) &&
      hasText(item?.start_date),
  );

  if (!hasCompleteExperience) {
    issues.push({
      code: PROFILE_QUALITY_CODES.INCOMPLETE_EXPERIENCE,
      field: 'experience',
      severity: 'high',
      message: 'Añade experiencia con puesto, empresa y descripción.',
    });
  }

  if (asArray(profile?.languages).length === 0) {
    issues.push({
      code: PROFILE_QUALITY_CODES.NO_LANGUAGES,
      field: 'languages',
      severity: 'low',
      message: 'Añadir idiomas mejora el matching internacional.',
    });
  }

  if (asArray(profile?.candidate_links).length === 0) {
    issues.push({
      code: PROFILE_QUALITY_CODES.NO_PORTFOLIO_LINKS,
      field: 'candidate_links',
      severity: 'low',
      message: 'Agrega enlaces de portafolio (GitHub, LinkedIn, web).',
    });
  }

  return issues;
}

export function summarizeProfileQuality(profile) {
  const issues = getCandidateProfileQualityIssues(profile);
  const severeCount = issues.filter((item) => item.severity === 'high').length;
  return {
    issues,
    issueCount: issues.length,
    severeCount,
    isStrong: issues.length === 0,
  };
}
