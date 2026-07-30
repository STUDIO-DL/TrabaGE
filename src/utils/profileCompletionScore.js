/**
 * Client mirror of public.get_profile_completion (migration 120).
 * Prefer the SQL RPC for authoritative server decisions; use this for UI only.
 */
function hasText(value, minLength = 1) {
  return String(value ?? '').trim().length >= minLength;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasSocialLinks(socialLinks) {
  if (!socialLinks || typeof socialLinks !== 'object') return false;
  return Object.values(socialLinks).some((v) => hasText(v));
}

export function buildPersonalCompletionSections(profile) {
  const skills = asArray(profile?.skills);
  const experience = asArray(profile?.experience);
  const education = asArray(profile?.education);
  const languages = asArray(profile?.languages);
  const certifications = asArray(profile?.certifications);
  const services = asArray(profile?.services);
  const projects = asArray(profile?.projects);
  const links = asArray(profile?.candidate_links);

  return [
    { key: 'full_name', label: 'Nombre', done: hasText(profile?.full_name) },
    { key: 'avatar', label: 'Foto de perfil', done: hasText(profile?.avatar_path || profile?.avatar_url) },
    { key: 'headline', label: 'Titular profesional', done: hasText(profile?.headline, 6) },
    { key: 'about', label: 'Acerca de mí', done: hasText(profile?.about, 30) },
    { key: 'sector', label: 'Sector', done: hasText(profile?.sector) },
    { key: 'city', label: 'Ciudad', done: hasText(profile?.city) },
    {
      key: 'experience',
      label: 'Experiencia',
      done: experience.some(
        (item) =>
          hasText(item?.position) &&
          hasText(item?.company) &&
          Boolean(item?.start_date),
      ),
    },
    {
      key: 'education',
      label: 'Educación',
      done: education.some(
        (item) => hasText(item?.institution) && hasText(item?.program || item?.specialty),
      ),
    },
    { key: 'skills', label: 'Habilidades', done: skills.length >= 1 },
    { key: 'languages', label: 'Idiomas', done: languages.length >= 1 },
    { key: 'services', label: 'Servicios', done: services.length >= 1 },
    { key: 'certifications', label: 'Certificaciones', done: certifications.length >= 1 },
    { key: 'projects', label: 'Proyectos', done: projects.length >= 1 },
    {
      key: 'links',
      label: 'Enlaces / redes',
      done: links.length >= 1 || hasSocialLinks(profile?.social_links),
    },
  ];
}

export function buildCompanyCompletionSections(profile, { accountType = 'business' } = {}) {
  const services = asArray(profile?.company_services ?? profile?.services);
  const projects = asArray(profile?.projects);
  const isOrg = accountType === 'organization';

  return [
    { key: 'company_name', label: 'Nombre', done: hasText(profile?.company_name) },
    { key: 'logo', label: 'Logo', done: hasText(profile?.logo_path) },
    { key: 'description', label: 'Descripción', done: hasText(profile?.description, 40) },
    {
      key: isOrg ? 'company_type' : 'sector',
      label: isOrg ? 'Tipo de organización' : 'Sector',
      done: isOrg ? hasText(profile?.company_type) : hasText(profile?.sector),
    },
    { key: 'city', label: 'Ubicación', done: hasText(profile?.city) },
    { key: 'website', label: 'Sitio web', done: hasText(profile?.website) },
    { key: 'social', label: 'Redes sociales', done: hasSocialLinks(profile?.social_links) },
    { key: 'services', label: 'Servicios', done: services.length >= 1 },
    { key: 'projects', label: 'Proyectos', done: projects.length >= 1 },
    {
      key: 'cover',
      label: 'Imagen de portada',
      done: hasText(profile?.cover_path || profile?.cover_url),
    },
  ];
}

export function summarizeCompletionSections(sections) {
  const list = asArray(sections);
  const total = list.length;
  const done = list.filter((s) => s.done).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const missing_sections = list.filter((s) => !s.done).map((s) => s.label);
  const completed_sections = list.filter((s) => s.done).map((s) => s.label);
  return { percent, missing_sections, completed_sections, sections: list };
}

export function isPersonalCompletionSufficient(sections, percent) {
  const byKey = Object.fromEntries(asArray(sections).map((s) => [s.key, s.done]));
  return (
    percent >= 55 &&
    Boolean(byKey.full_name) &&
    Boolean(byKey.headline || byKey.about) &&
    Boolean(byKey.experience || byKey.education || byKey.skills)
  );
}

export function isCompanyCompletionSufficient(sections, percent) {
  const byKey = Object.fromEntries(asArray(sections).map((s) => [s.key, s.done]));
  return percent >= 55 && Boolean(byKey.company_name) && Boolean(byKey.description) && Boolean(byKey.city);
}

/**
 * @param {'personal'|'business'|'organization'} accountType
 * @param {object} profile — full profile with related sections attached
 */
export function getProfileCompletionScore(accountType, profile) {
  const type = accountType === 'organization' || accountType === 'business' ? accountType : 'personal';
  const sections =
    type === 'personal'
      ? buildPersonalCompletionSections(profile)
      : buildCompanyCompletionSections(profile, { accountType: type });
  const summary = summarizeCompletionSections(sections);
  const sufficient =
    type === 'personal'
      ? isPersonalCompletionSufficient(sections, summary.percent)
      : isCompanyCompletionSufficient(sections, summary.percent);

  return {
    account_type: type,
    percent: summary.percent,
    sufficient,
    missing_sections: summary.missing_sections,
    completed_sections: summary.completed_sections,
    sections: summary.sections,
  };
}
