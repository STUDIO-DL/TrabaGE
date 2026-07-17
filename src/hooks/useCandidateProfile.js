import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { refetchProfileCache, useProfile } from './useProfile';
import { profileService } from '../services/profile.service';
import { storageService } from '../services/storage.service';
import { jobMatchesService } from '../services/jobMatches.service';
import { cvPath, avatarPath } from '../constants/storage';
import { compressProfileImage } from '../utils/imageCompression';
import { validateFile } from '../utils/validateFile';
import { reportError } from '../utils/logger';
import {
  applyOptimisticUpdate,
  getCacheKey,
  mergeProfileCache,
} from '../services/profileCache';
import { isEmployerRole } from '../constants/roles';

function friendlyProfileError(error) {
  if (!error) return null;
  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('violates row-level security')) {
    return { ...error, message: 'No tienes permisos para modificar este dato.' };
  }
  if (message.includes('duplicate key')) {
    return { ...error, message: 'Ese dato ya existe en tu perfil.' };
  }
  if (message.includes('storage') || message.includes('bucket')) {
    return { ...error, message: 'No se pudo subir el archivo. Inténtalo de nuevo.' };
  }

  return { ...error, message: 'No se pudo guardar el cambio. Inténtalo de nuevo.' };
}

export function useCandidateProfile() {
  const { user, role, isPreviewMode } = useAuth();
  const { profile, loading, error, refetch, cacheKey } = useProfile();

  const userId = user?.id;
  const ownCacheKey =
    cacheKey ??
    getCacheKey(userId, {
      role,
      isPreviewMode,
      viewingOtherCandidate: false,
      isEmployerRole,
    });

  const syncFullProfile = useCallback(async () => {
    if (!userId || !ownCacheKey) return null;
    return refetchProfileCache(ownCacheKey, () => profileService.getCandidateFullProfile(userId));
  }, [ownCacheKey, userId]);

  const afterCandidateProfileChanged = useCallback(async () => {
    await syncFullProfile();
    if (userId) {
      jobMatchesService.recalculateForCandidate(userId).catch((recalcError) => {
        reportError(recalcError, { area: 'candidate_match_recalculation', userId });
      });
    }
  }, [syncFullProfile, userId]);

  const runMutation = useCallback(
    async ({ optimistic, execute, mergeResult, resync = true }) => {
      const rollback = optimistic && ownCacheKey ? applyOptimisticUpdate(ownCacheKey, optimistic) : null;

      try {
        const result = await execute();
        if (result?.error) {
          rollback?.();
          await syncFullProfile();
          return { data: result.data ?? null, error: friendlyProfileError(result.error) };
        }

        if (ownCacheKey && mergeResult) {
          const patch = mergeResult(result);
          if (patch) mergeProfileCache(ownCacheKey, patch);
        }

        if (resync) {
          void afterCandidateProfileChanged();
        }

        return { data: result?.data ?? null, error: null };
      } catch (mutationError) {
        rollback?.();
        await syncFullProfile();
        return {
          data: null,
          error: friendlyProfileError(mutationError),
        };
      }
    },
    [afterCandidateProfileChanged, ownCacheKey, syncFullProfile],
  );

  const updateBasicInfo = useCallback(
    async (data) =>
      runMutation({
        optimistic: data,
        execute: () => profileService.updateCandidateProfile(userId, data),
        mergeResult: (result) => result.data ?? data,
        resync: true,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const uploadAvatar = useCallback(
    async (file) => {
      const validation = validateFile(file, 'avatar');
      if (!validation.valid) return { error: { message: validation.error } };

      let compressed;
      try {
        compressed = await compressProfileImage(file);
      } catch (compressError) {
        return { error: { message: compressError.message } };
      }

      const { error: uploadError } = await storageService.uploadAvatar(
        userId,
        compressed,
        profile?.avatar_path,
      );
      if (uploadError) return { error: friendlyProfileError(uploadError) };

      return updateBasicInfo({ avatar_path: avatarPath(userId) });
    },
    [userId, profile?.avatar_path, updateBasicInfo],
  );

  const uploadCV = useCallback(
    async (file) => {
      const validation = validateFile(file, 'cv');
      if (!validation.valid) return { error: { message: validation.error } };

      const { error: uploadError } = await storageService.uploadCV(
        userId,
        file,
        profile?.cv_path,
      );
      if (uploadError) return { error: friendlyProfileError(uploadError) };

      return updateBasicInfo({
        cv_path: cvPath(userId),
        cv_name: file.name,
      });
    },
    [userId, profile?.cv_path, updateBasicInfo],
  );

  const saveCoverLetter = useCallback(
    async (text) => updateBasicInfo({ cover_letter: text?.trim() || null }),
    [updateBasicInfo],
  );

  const addExperience = useCallback(
    async (data) =>
      runMutation({
        optimistic: (current) => ({
          experience: [...(current.experience ?? []), { ...data, user_id: userId, id: `temp-${Date.now()}` }],
        }),
        execute: () => profileService.addExperience({ ...data, user_id: userId }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const updateExperience = useCallback(
    async (id, data) =>
      runMutation({
        optimistic: (current) => ({
          experience: (current.experience ?? []).map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        }),
        execute: () => profileService.updateExperience(id, data),
        mergeResult: (result) =>
          result.data
            ? {
                experience: (profile?.experience ?? []).map((item) =>
                  item.id === id ? { ...item, ...result.data } : item,
                ),
              }
            : null,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [profile?.experience, runMutation],
  );

  const deleteExperience = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          experience: (current.experience ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteExperience(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addEducation = useCallback(
    async (data) =>
      runMutation({
        optimistic: (current) => ({
          education: [...(current.education ?? []), { ...data, user_id: userId, id: `temp-${Date.now()}` }],
        }),
        execute: () => profileService.addEducation({ ...data, user_id: userId }),
        mergeResult: (result) =>
          result.data
            ? {
                education: [
                  ...(profile?.education ?? []).filter((item) => !String(item.id).startsWith('temp-')),
                  result.data,
                ],
              }
            : null,
      }),
    [profile?.education, runMutation, userId],
  );

  const updateEducation = useCallback(
    async (id, data) =>
      runMutation({
        optimistic: (current) => ({
          education: (current.education ?? []).map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        }),
        execute: () => profileService.updateEducation(id, data),
        mergeResult: (result) =>
          result.data
            ? {
                education: (profile?.education ?? []).map((item) =>
                  item.id === id ? { ...item, ...result.data } : item,
                ),
              }
            : null,
      }),
    [profile?.education, runMutation],
  );

  const deleteEducation = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          education: (current.education ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteEducation(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addCertification = useCallback(
    async (data) =>
      runMutation({
        optimistic: (current) => ({
          certifications: [
            ...(current.certifications ?? []),
            { ...data, user_id: userId, id: `temp-${Date.now()}` },
          ],
        }),
        execute: () => profileService.addCertification({ ...data, user_id: userId }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const updateCertification = useCallback(
    async (id, data) =>
      runMutation({
        optimistic: (current) => ({
          certifications: (current.certifications ?? []).map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        }),
        execute: () => profileService.updateCertification(id, data),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const deleteCertification = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          certifications: (current.certifications ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteCertification(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addSkill = useCallback(
    async (name) =>
      runMutation({
        execute: () => profileService.addSkill({ user_id: userId, name }),
        mergeResult: (result) =>
          result.data
            ? { skills: [...(profile?.skills ?? []), result.data].filter(Boolean) }
            : null,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [profile?.skills, runMutation, userId],
  );

  const deleteSkill = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          skills: (current.skills ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteSkill(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addService = useCallback(
    async (name) =>
      runMutation({
        execute: () => profileService.addService({ user_id: userId, name }),
        mergeResult: (result) =>
          result.data
            ? { services: [...(profile?.services ?? []), result.data] }
            : null,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [profile?.services, runMutation, userId],
  );

  const deleteService = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          services: (current.services ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteService(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addLanguage = useCallback(
    async (data) =>
      runMutation({
        optimistic: (current) => ({
          languages: [...(current.languages ?? []), { ...data, user_id: userId, id: `temp-${Date.now()}` }],
        }),
        execute: () => profileService.addLanguage({ ...data, user_id: userId }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const updateLanguage = useCallback(
    async (id, data) =>
      runMutation({
        optimistic: (current) => ({
          languages: (current.languages ?? []).map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        }),
        execute: () => profileService.updateLanguage(id, data),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const deleteLanguage = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          languages: (current.languages ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteLanguage(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addCandidateLink = useCallback(
    async (data) =>
      runMutation({
        execute: () => profileService.addCandidateLink({ ...data, user_id: userId }),
        mergeResult: (result) =>
          result.data
            ? { candidate_links: [...(profile?.candidate_links ?? []), result.data] }
            : null,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [profile?.candidate_links, runMutation, userId],
  );

  const updateCandidateLink = useCallback(
    async (id, data) =>
      runMutation({
        optimistic: (current) => ({
          candidate_links: (current.candidate_links ?? []).map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        }),
        execute: () => profileService.updateCandidateLink(id, data),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const deleteCandidateLink = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          candidate_links: (current.candidate_links ?? []).filter((item) => item.id !== id),
        }),
        execute: () => profileService.deleteCandidateLink(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  return {
    profile,
    loading,
    error,
    refetch,
    updateBasicInfo,
    uploadAvatar,
    uploadCV,
    saveCoverLetter,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    addCertification,
    updateCertification,
    deleteCertification,
    addSkill,
    deleteSkill,
    addService,
    deleteService,
    addLanguage,
    updateLanguage,
    deleteLanguage,
    addCandidateLink,
    updateCandidateLink,
    deleteCandidateLink,
  };
}
