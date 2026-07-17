import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { ROLES, isEmployerRole } from '../constants/roles';
import { getPreviewApplicantProfile, getPreviewProfile, PREVIEW_USER } from '../constants/preview';

const profileCache = new Map();
const cacheListeners = new Map();

function getCacheKey(targetId, { role, isPreviewMode, viewingOtherCandidate }) {
  if (!targetId || isPreviewMode) return null;
  if (viewingOtherCandidate) return `public:candidate:${targetId}`;
  if (!isEmployerRole(role)) return `own:candidate:${targetId}`;
  return `own:company:${targetId}`;
}

function getCachedProfile(cacheKey) {
  if (!cacheKey) return null;
  return profileCache.get(cacheKey) ?? null;
}

function setCachedProfile(cacheKey, profile) {
  if (!cacheKey) return;
  profileCache.set(cacheKey, profile);
  cacheListeners.get(cacheKey)?.forEach((listener) => listener(profile));
}

export function mergeOwnCandidateProfile(userId, partial) {
  if (!userId || !partial) return;
  const cacheKey = `own:candidate:${userId}`;
  const current = profileCache.get(cacheKey);
  if (!current) return;
  setCachedProfile(cacheKey, { ...current, ...partial });
}

function subscribeToProfileCache(cacheKey, listener) {
  if (!cacheKey) return () => {};
  if (!cacheListeners.has(cacheKey)) cacheListeners.set(cacheKey, new Set());
  cacheListeners.get(cacheKey).add(listener);
  return () => cacheListeners.get(cacheKey)?.delete(listener);
}

export function useProfile(userId) {
  const { user, role, isPreviewMode } = useAuth();
  const targetId = userId || user?.id;
  const viewingOtherCandidate = Boolean(userId) && userId !== user?.id;
  const cacheKey = getCacheKey(targetId, { role, isPreviewMode, viewingOtherCandidate });
  const cachedProfile = getCachedProfile(cacheKey);

  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cacheKey) return undefined;
    return subscribeToProfileCache(cacheKey, (nextProfile) => {
      setProfile(nextProfile);
      setLoading(false);
      setError(null);
    });
  }, [cacheKey]);

  const fetchProfile = useCallback(async () => {
    if (!targetId) return;

    if (isPreviewMode) {
      if (userId) {
        const applicantProfile = getPreviewApplicantProfile(userId);
        if (applicantProfile) {
          setProfile(applicantProfile);
          setError(null);
          setLoading(false);
          return;
        }
        if (userId === PREVIEW_USER.id) {
          setProfile(getPreviewProfile(ROLES.BUSINESS));
          setError(null);
          setLoading(false);
          return;
        }
      } else {
        setProfile(getPreviewProfile(role));
        setError(null);
        setLoading(false);
        return;
      }
    }

    if (!getCachedProfile(cacheKey)) {
      setLoading(true);
    }
    setError(null);

    const isCandidate = userId ? true : !isEmployerRole(role);
    const viewingOtherCandidate = Boolean(userId) && userId !== user?.id;
    const { data, error: fetchError } = isCandidate
      ? viewingOtherCandidate
        ? await profileService.getPublicCandidateFullProfile(targetId)
        : await profileService.getCandidateFullProfile(targetId)
      : userId && userId !== user?.id
        ? await companyService.getPublicProfile(targetId)
        : await companyService.getCompanyProfile(targetId);

    setProfile(data);
    setError(fetchError?.message ?? null);
    setLoading(false);

    if (!fetchError && data && cacheKey) {
      setCachedProfile(cacheKey, data);
    }
  }, [targetId, role, userId, user?.id, isPreviewMode, cacheKey]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
