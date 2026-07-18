import { ROLES, isEmployerRole, isPersonalRole, normalizeRole } from '../constants/roles';
import {
  isCandidateRequiredComplete,
  isCompanyRequiredComplete,
  isProfileSetupComplete,
} from './profileRequirements';

/**
 * Derive setup_complete flag to persist alongside profile edits.
 * Keeps DB aligned with client routing and publish/matching gates.
 */
export function deriveSetupCompleteFlag(role, profile, patch = {}) {
  const merged = { ...(profile ?? {}), ...(patch ?? {}) };
  const resolvedRole = normalizeRole(role, { companyType: merged.company_type }) ?? role;

  if (resolvedRole === ROLES.ADMIN) return true;
  if (isPersonalRole(resolvedRole)) {
    return isCandidateRequiredComplete(merged) || isProfileSetupComplete(resolvedRole, merged);
  }
  if (isEmployerRole(resolvedRole)) {
    return isCompanyRequiredComplete(merged) || isProfileSetupComplete(resolvedRole, merged);
  }
  return false;
}

export function withSetupComplete(role, profile, patch) {
  const setup_complete = deriveSetupCompleteFlag(role, profile, patch);
  return { ...patch, setup_complete };
}
