import { ROLES, isEmployerRole, isPersonalRole, normalizeRole } from '../constants/roles';
import { isInstitutionProfile } from './orgLabels';

// Two tiers of profile requirements:
//
// 1. Bootstrap identity — captured at registration/OAuth (full_name, company_name,
//    company_type). When present, setupComplete is true and the user lands on their
//    profile instead of a redundant setup wizard. Welcome email fires on auth.users
//    insert/update and is NOT gated by setupComplete.
//
// 2. Enrichment — headline/location/sector (Edit Intro) or company description/sector
//    (profile editor). Used by setup pages (edge cases only) and PublishJob gating.

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

/** Identity fields that must exist after bootstrap (from registration metadata). */
export function getCandidateBootstrapMissing(profile) {
  if (!profile) return ['full_name'];
  const missing = [];
  if (!hasText(profile.full_name)) missing.push('full_name');
  return missing;
}

/** Identity fields that must exist after bootstrap for business/organization accounts. */
export function getCompanyBootstrapMissing(profile, role = null) {
  if (!profile) return ['company_name'];
  const resolvedRole = normalizeRole(role, { companyType: profile?.company_type });
  const institution =
    resolvedRole === ROLES.ORGANIZATION || isInstitutionProfile(profile);
  const missing = [];
  if (!hasText(profile.company_name)) missing.push('company_name');
  if (institution && !hasText(profile.company_type)) missing.push('company_type');
  return missing;
}

// Enrichment fields for setup assistant (only shown when bootstrap identity is
// missing, or for legacy users who explicitly marked setup_complete).
export function getCandidateRequiredMissing(profile) {
  return getCandidateBootstrapMissing(profile);
}

// Company enrichment for publishing jobs and optional setup assistant.
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

export function isCandidateBootstrapComplete(profile) {
  return getCandidateBootstrapMissing(profile).length === 0;
}

export function isCompanyBootstrapComplete(profile, role = null) {
  return getCompanyBootstrapMissing(profile, role).length === 0;
}

export function isCandidateRequiredComplete(profile) {
  return isCandidateBootstrapComplete(profile);
}

export function isCompanyRequiredComplete(profile) {
  return getCompanyRequiredMissing(profile).length === 0;
}

/**
 * Gates app access (RoleRoute, getHomePath). True when bootstrap identity exists
 * or the profile was explicitly marked complete by an older setup flow.
 */
export function isProfileSetupComplete(role, profile) {
  if (role === ROLES.ADMIN) return true;
  if (!profile) return false;
  if (profile.setup_complete === true) return true;
  if (isPersonalRole(role)) return isCandidateBootstrapComplete(profile);
  if (isEmployerRole(role)) {
    const resolvedRole = normalizeRole(role, { companyType: profile?.company_type }) ?? role;
    return isCompanyBootstrapComplete(profile, resolvedRole);
  }
  return false;
}
