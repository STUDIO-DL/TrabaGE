import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { ROLES, isEmployerRole } from '../constants/roles';
import { getPreviewApplicantProfile, getPreviewProfile, PREVIEW_USER } from '../constants/preview';
import { getProfileQueryKey } from '../constants/profileQueryKeys';

async function fetchProfileForKey(targetId, { role, userId, currentUserId }) {
  const isCandidate = userId ? true : !isEmployerRole(role);
  const viewingOther = Boolean(userId) && userId !== currentUserId;

  const result = isCandidate
    ? viewingOther
      ? await profileService.getPublicCandidateFullProfile(targetId)
      : await profileService.getCandidateFullProfile(targetId)
    : viewingOther
      ? await companyService.getPublicProfile(targetId)
      : await companyService.getCompanyProfile(targetId);

  if (result.error) {
    throw result.error;
  }

  return result.data ?? null;
}

export function useProfile(userId) {
  const { user, role, isPreviewMode } = useAuth();
  const targetId = userId || user?.id;
  const viewingOther = Boolean(userId) && userId !== user?.id;
  const isCandidate = userId ? true : !isEmployerRole(role);
  const viewingOtherCandidate = viewingOther && isCandidate;
  const viewingOtherCompany = viewingOther && !isCandidate;

  const queryKey = getProfileQueryKey(targetId, {
    role,
    isPreviewMode,
    viewingOtherCandidate,
    viewingOtherCompany,
  });

  const query = useQuery({
    queryKey: queryKey ?? ['profile', 'disabled'],
    enabled: Boolean(queryKey) && Boolean(targetId) && !isPreviewMode,
    queryFn: () =>
      fetchProfileForKey(targetId, {
        role,
        userId,
        currentUserId: user?.id,
      }),
  });

  if (isPreviewMode) {
    if (userId) {
      const applicantProfile = getPreviewApplicantProfile(userId);
      if (applicantProfile) {
        return {
          profile: applicantProfile,
          loading: false,
          error: null,
          refetch: async () => applicantProfile,
          queryKey: null,
        };
      }
      if (userId === PREVIEW_USER.id) {
        const preview = getPreviewProfile(ROLES.BUSINESS);
        return {
          profile: preview,
          loading: false,
          error: null,
          refetch: async () => preview,
          queryKey: null,
        };
      }
      return {
        profile: null,
        loading: false,
        error: null,
        refetch: async () => null,
        queryKey: null,
      };
    }

    const preview = getPreviewProfile(role);
    return {
      profile: preview,
      loading: false,
      error: null,
      refetch: async () => preview,
      queryKey: null,
    };
  }

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    queryKey,
  };
}

export { getProfileQueryKey } from '../constants/profileQueryKeys';
