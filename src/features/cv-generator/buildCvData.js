import { formatDateRange } from '../../utils/formatDate';
import { resolveAvatarUrl } from '../../utils/storagePaths';

function sortByStartDateDesc(items) {
  return [...items].sort((a, b) => {
    const aTime = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bTime = b.start_date ? new Date(b.start_date).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    const aEnd = a.end_date ? new Date(a.end_date).getTime() : Date.now();
    const bEnd = b.end_date ? new Date(b.end_date).getTime() : Date.now();
    return bEnd - aEnd;
  });
}

function buildLocation(profile) {
  return [profile?.city, profile?.province, profile?.country].filter(Boolean).join(', ');
}

function extractCertYear(issuedDate) {
  if (!issuedDate) return null;
  const year = new Date(issuedDate).getFullYear();
  return Number.isNaN(year) ? null : String(year);
}

function countFilledSections(data) {
  let count = 0;
  if (data.about) count += 1;
  if (data.experience.length) count += 1;
  if (data.education.length) count += 1;
  if (data.skills.length) count += 1;
  if (data.languages.length) count += 1;
  if (data.certifications.length) count += 1;
  return count;
}

/**
 * Normalizes candidate profile data for CV PDF generation.
 * Email uses the auth account email only (not contact_email).
 *
 * @param {object} profile - Full candidate profile from useProfile
 * @param {string} [accountEmail] - user.email from auth (registration email)
 */
export function buildCvData(profile, accountEmail) {
  const email = accountEmail?.trim() || null;
  const avatarUrl = profile?.avatar_path ? resolveAvatarUrl(profile.avatar_path) : null;

  const experience = sortByStartDateDesc(profile?.experience ?? [])
    .filter((item) => item.company || item.position)
    .map((item) => ({
      company: item.company?.trim() || '',
      position: item.position?.trim() || '',
      dateRange: formatDateRange(item.start_date, item.end_date),
      description: item.description?.trim() || '',
    }));

  const education = sortByStartDateDesc(profile?.education ?? [])
    .filter((item) => item.institution || item.program)
    .map((item) => ({
      institution: item.institution?.trim() || '',
      program: item.program?.trim() || '',
      dateRange: formatDateRange(item.start_date, item.is_current ? null : item.end_date),
    }));

  const skills = (profile?.skills ?? [])
    .map((item) => item.name?.trim())
    .filter(Boolean);

  const languages = (profile?.languages ?? [])
    .filter((item) => item.language?.trim())
    .map((item) => ({
      language: item.language.trim(),
      level: item.level?.trim() || null,
    }));

  const certifications = (profile?.certifications ?? [])
    .filter((item) => item.name?.trim())
    .map((item) => ({
      name: item.name.trim(),
      issuer: item.issuer?.trim() || null,
      year: extractCertYear(item.issued_date),
    }));

  const data = {
    fullName: profile?.full_name?.trim() || 'Candidato',
    headline: profile?.headline?.trim() || null,
    location: buildLocation(profile) || null,
    email,
    avatarUrl,
    about: profile?.about?.trim() || null,
    experience,
    education,
    skills,
    languages,
    certifications,
  };

  data.isSparse = countFilledSections(data) < 2 && !data.headline;

  return data;
}

export function sanitizeCvFilename(fullName) {
  const base = (fullName || 'Candidato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  return `CV-${base || 'TrabaGE'}.pdf`;
}
