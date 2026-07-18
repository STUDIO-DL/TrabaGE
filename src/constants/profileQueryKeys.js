import { isEmployerRole } from './roles';

/**
 * React Query keys for profile reads. Cleared on logout via queryClient.clear().
 */
export function getProfileQueryKey(
  targetId,
  { role, isPreviewMode, viewingOtherCandidate, viewingOtherCompany } = {},
) {
  if (!targetId || isPreviewMode) return null;

  if (viewingOtherCandidate) {
    return ['profile', 'public', 'candidate', targetId];
  }

  if (viewingOtherCompany) {
    return ['profile', 'public', 'company', targetId];
  }

  if (!isEmployerRole(role)) {
    return ['profile', 'own', 'candidate', targetId];
  }

  return ['profile', 'own', 'company', targetId];
}

export function getOwnCandidateProfileKey(userId) {
  if (!userId) return null;
  return ['profile', 'own', 'candidate', userId];
}

export function getOwnCompanyProfileKey(userId) {
  if (!userId) return null;
  return ['profile', 'own', 'company', userId];
}

export const PROFILE_QUERY_ROOT = ['profile'];
