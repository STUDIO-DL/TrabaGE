function hasText(value, minLength = 1) {
  return String(value ?? '').trim().length >= minLength;
}

export function getCompanyProfileChecklist(profile, jobCount = 0) {
  const socialLinks = Object.values(profile?.social_links ?? {}).filter(Boolean);

  return [
    {
      key: 'logo',
      label: 'Logo de la empresa',
      done: hasText(profile?.logo_path),
    },
    {
      key: 'description',
      label: 'Descripción',
      done: hasText(profile?.description, 40),
    },
    {
      key: 'social',
      label: 'Redes sociales',
      done: socialLinks.length > 0,
    },
    {
      key: 'jobs',
      label: 'Oferta de empleo activa',
      done: jobCount > 0,
    },
  ];
}

export function getCompanyCompletenessPercent(profile, jobCount = 0) {
  const checklist = getCompanyProfileChecklist(profile, jobCount);
  const passed = checklist.filter((item) => item.done).length;
  if (checklist.length === 0) return 0;
  return Math.round((passed / checklist.length) * 100);
}

export function getCompanyCompletenessDetails(profile) {
  const socialLinks = Object.values(profile?.social_links ?? {}).filter(Boolean);
  const checks = [
    hasText(profile?.company_name),
    hasText(profile?.description, 40),
    hasText(profile?.sector),
    hasText(profile?.city),
    hasText(profile?.logo_path),
    hasText(profile?.cover_url),
    hasText(profile?.website),
    socialLinks.length > 0,
    hasText(profile?.company_size),
    Boolean(profile?.founded_year),
  ];

  const passed = checks.filter(Boolean).length;
  let level = 'basic';
  if (passed >= 5) level = 'partial';
  if (passed >= 9) level = 'complete';

  return { level, passed, total: checks.length };
}

export function getCompanyCompletenessWeight(profile) {
  const { level } = getCompanyCompletenessDetails(profile);
  if (level === 'complete') return 1;
  if (level === 'partial') return 0.5;
  return 0;
}
