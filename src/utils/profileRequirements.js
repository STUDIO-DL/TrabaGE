import { ROLES, isEmployerRole, isPersonalRole } from '../constants/roles';
import { isInstitutionProfile } from './orgLabels';

// Minimum "required" fields that gate the onboarding experience. This is
// intentionally lighter than the richer completeness *levels* in
// profileCompleteness.js / companyProfileCompleteness.js: it only decides
// whether a user is guided to the setup assistant and (for companies) whether
// they may publish jobs yet. Name/email/photo are backfilled from Google, so
// they are not part of what TrabaGE asks for again.

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

// Candidato: city + profesión (headline). full_name is backfilled at sign-up
// (Google/manual metadata via profileBootstrap) and is not re-collected here.
export function getCandidateRequiredMissing(profile) {
  if (!profile) return ['city', 'headline'];
  const missing = [];
  if (!hasText(profile.city)) missing.push('city');
  if (!hasText(profile.headline)) missing.push('headline');
  return missing;
}

// Empresa: company_name, sector, city, description.
// Institución: company_name, institution type (company_type), city, description.
export function getCompanyRequiredMissing(profile) {
  if (!profile) return ['company_name', 'sector', 'city', 'description'];
  const institution = isInstitutionProfile(profile);
  const missing = [];
  if (!hasText(profile.company_name)) missing.push('company_name');
  if (!hasText(profile.city)) missing.push('city');
  if (!hasText(profile.description)) missing.push('description');
  if (institution) {
    if (!hasText(profile.company_type)) missing.push('company_type');
  } else if (!hasText(profile.sector)) {
    missing.push('sector');
  }
  return missing;
}

export function isCandidateRequiredComplete(profile) {
  return getCandidateRequiredMissing(profile).length === 0;
}

export function isCompanyRequiredComplete(profile) {
  return getCompanyRequiredMissing(profile).length === 0;
}

// A profile is considered "ready" if it was explicitly marked complete OR if the
// minimum required fields are present. The OR keeps existing users who finished
// an older, lighter setup from being pushed back into onboarding, while still
// guiding brand-new (Google/manual) users who are missing required data.
export function isProfileSetupComplete(role, profile) {
  if (role === ROLES.ADMIN) return true;
  if (!profile) return false;
  if (profile.setup_complete === true) return true;
  if (isPersonalRole(role)) return isCandidateRequiredComplete(profile);
  if (isEmployerRole(role)) return isCompanyRequiredComplete(profile);
  return false;
}
