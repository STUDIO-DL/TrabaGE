import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { ROLES, isEmployerRole } from '../constants/roles';
import { getPreviewApplicantProfile, getPreviewProfile, PREVIEW_USER } from '../constants/preview';
import {
  fetchProfileCached,
  getCacheKey,
  getCachedProfile,
  subscribeProfileCache,
} from '../services/profileCache';

export { mergeOwnCandidateProfile, mergeOwnCompanyProfile } from '../services/profileCache';

export function useProfile(userId) {
  const { user, role, isPreviewMode } = useAuth();
  const targetId = userId || user?.id;
  const viewingOtherCandidate = Boolean(userId) && userId !== user?.id;
  const cacheKey = getCacheKey(targetId, {
    role,
    isPreviewMode,
    viewingOtherCandidate,
    isEmployerRole,
  });
  const cachedProfile = getCachedProfile(cacheKey);

  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cacheKey) return undefined;

    const cached = getCachedProfile(cacheKey);
    setProfile(cached);
    setLoading(!cached);

    return subscribeProfileCache(cacheKey, (nextProfile) => {
      setProfile(nextProfile);
      setLoading(false);
      setError(null);
    });
  }, [cacheKey]);

  const fetchProfile = useCallback(
    async ({ background = false, force = false } = {}) => {
      if (!targetId) return null;

      if (isPreviewMode) {
        if (userId) {
          const applicantProfile = getPreviewApplicantProfile(userId);
          if (applicantProfile) {
            setProfile(applicantProfile);
            setError(null);
            setLoading(false);
            return applicantProfile;
          }
          if (userId === PREVIEW_USER.id) {
            const preview = getPreviewProfile(ROLES.BUSINESS);
            setProfile(preview);
            setError(null);
            setLoading(false);
            return preview;
          }
          setProfile(null);
          setError(null);
          setLoading(false);
          return null;
        } else {
          const preview = getPreviewProfile(role);
          setProfile(preview);
          setError(null);
          setLoading(false);
          return preview;
        }
      }

      if (!cacheKey) {
        if (!background) setLoading(false);
        return null;
      }

      if (!background && !getCachedProfile(cacheKey)) {
        setLoading(true);
      }
      setError(null);

      const isCandidate = userId ? true : !isEmployerRole(role);
      const viewingOther = Boolean(userId) && userId !== user?.id;

      const { data, error: fetchError } = await fetchProfileCached(
        cacheKey,
        () =>
          isCandidate
            ? viewingOther
              ? profileService.getPublicCandidateFullProfile(targetId)
              : profileService.getCandidateFullProfile(targetId)
            : userId && userId !== user?.id
              ? companyService.getPublicProfile(targetId)
              : companyService.getCompanyProfile(targetId),
        { force },
      );

      if (fetchError) {
        setError(fetchError.message ?? null);
        if (!background) setLoading(false);
        return null;
      }

      if (data) {
        setProfile(data);
        setError(null);
        setLoading(false);
        return data;
      }

      if (!background) setLoading(false);
      return null;
    },
    [targetId, role, userId, user?.id, isPreviewMode, cacheKey],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refetch = useCallback(() => fetchProfile({ background: true, force: true }), [fetchProfile]);

  return { profile, loading, error, refetch, cacheKey };
}

/**
 * Imperative refetch for mutation hooks — keeps cache subscribers in sync without
 * requiring a mounted useProfile instance.
 */
export async function refetchProfileCache(cacheKey, fetcher) {
  if (!cacheKey) return null;

  const { data, error: fetchError } = await fetchProfileCached(cacheKey, fetcher, { force: true });
  if (fetchError || !data) return null;
  return data;
}
