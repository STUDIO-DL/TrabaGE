import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { profileService } from '../services/profile.service';
import { storageService } from '../services/storage.service';
import { jobMatchesService } from '../services/jobMatches.service';
import { cvPath, avatarPath, candidateCoverPath } from '../constants/storage';
import { validateFile } from '../utils/validateFile';
import { reportError } from '../utils/logger';
import { syncAuthIdentityMetadata } from '../utils/displayIdentity';
import { getOwnCandidateProfileKey, getProfileQueryKey } from '../constants/profileQueryKeys';
import { withSetupComplete } from '../utils/profilePersistence';

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
  if (error.code === 'WRITE_NO_ROW') {
    return error;
  }

  return { ...error, message: error.message || 'No se pudo guardar el cambio. Inténtalo de nuevo.' };
}

function mergeBaseProfileRow(current, row) {
  if (!row) return current ?? null;
  if (!current) return row;
  return { ...current, ...row };
}

export function useCandidateProfile() {
  const queryClient = useQueryClient();
  const { user, role, isPreviewMode, refreshSetupStatus } = useAuth();
  const { profile, loading, error, refetch, queryKey } = useProfile();

  const userId = user?.id;
  const ownQueryKey =
    queryKey ??
    getProfileQueryKey(userId, {
      role,
      isPreviewMode,
      viewingOtherCandidate: false,
      viewingOtherCompany: false,
    }) ??
    getOwnCandidateProfileKey(userId);

  const syncFullProfile = useCallback(async () => {
    if (!ownQueryKey) return null;
    await queryClient.invalidateQueries({ queryKey: ownQueryKey });
    const result = await refetch();
    return result.data ?? null;
  }, [ownQueryKey, queryClient, refetch]);

  const invalidateProfileQueries = useCallback(async () => {
    if (!userId) return null;
    await queryClient.invalidateQueries({ queryKey: ['profile', 'public', 'candidate', userId] });
    return syncFullProfile();
  }, [queryClient, syncFullProfile, userId]);

  const afterCandidateProfileChanged = useCallback(async () => {
    await invalidateProfileQueries();
    if (userId) {
      jobMatchesService.recalculateForCandidate(userId).catch((recalcError) => {
        reportError(recalcError, { area: 'candidate_match_recalculation', userId });
      });
    }
  }, [invalidateProfileQueries, userId]);

  const runMutation = useCallback(
    async ({ execute, patchCache, resync = true }) => {
      try {
        const result = await execute();
        if (result?.error) {
          await syncFullProfile();
          return { data: result.data ?? null, error: friendlyProfileError(result.error) };
        }

        if (ownQueryKey && patchCache) {
          queryClient.setQueryData(ownQueryKey, (current) => patchCache(current, result.data));
        } else if (ownQueryKey && result.data && !Array.isArray(result.data)) {
          queryClient.setQueryData(ownQueryKey, (current) => mergeBaseProfileRow(current, result.data));
        }

        if (resync) {
          await afterCandidateProfileChanged();
        }

        return { data: result?.data ?? null, error: null };
      } catch (mutationError) {
        await syncFullProfile();
        return {
          data: null,
          error: friendlyProfileError(mutationError),
        };
      }
    },
    [afterCandidateProfileChanged, ownQueryKey, queryClient, syncFullProfile],
  );

  const updateBasicInfo = useCallback(
    async (data) => {
      const payload = withSetupComplete(role, profile, data);
      const { error: saveError } = await runMutation({
        execute: () => profileService.updateCandidateProfile(userId, payload),
        patchCache: (current, row) => mergeBaseProfileRow(current, row),
        resync: true,
      }).then(({ error }) => ({ error }));

      if (!saveError && data.full_name) {
        void syncAuthIdentityMetadata({ full_name: data.full_name });
      }

      if (!saveError) {
        void refreshSetupStatus();
      }

      return { error: saveError };
    },
    [profile, refreshSetupStatus, role, runMutation, userId],
  );

  const uploadAvatar = useCallback(
    async (file, { onProgress } = {}) => {
      const validation = validateFile(file, 'avatar');
      if (!validation.valid) return { error: { message: validation.error } };

      try {
        const { error: uploadError } = await storageService.uploadAvatar(
          userId,
          file,
          profile?.avatar_path,
          { onProgress },
        );
        if (uploadError) return { error: friendlyProfileError(uploadError) };

        return updateBasicInfo({ avatar_path: avatarPath(userId) });
      } catch (uploadError) {
        return { error: { message: uploadError.message || 'No se pudo subir la foto.' } };
      }
    },
    [userId, profile?.avatar_path, updateBasicInfo],
  );

  const uploadCV = useCallback(
    async (file, { onProgress } = {}) => {
      const validation = validateFile(file, 'cv');
      if (!validation.valid) return { error: { message: validation.error } };

      try {
        const { error: uploadError } = await storageService.uploadCV(
          userId,
          file,
          profile?.cv_path,
          { onProgress },
        );
        if (uploadError) return { error: friendlyProfileError(uploadError) };

        return updateBasicInfo({
          cv_path: cvPath(userId),
          cv_name: file.name,
        });
      } catch (uploadError) {
        return { error: { message: uploadError.message || 'No se pudo subir el CV.' } };
      }
    },
    [userId, profile?.cv_path, updateBasicInfo],
  );

  const saveCoverLetter = useCallback(
    async (text) => updateBasicInfo({ cover_letter: text?.trim() || null }),
    [updateBasicInfo],
  );

  const uploadCover = useCallback(
    async (file, { onProgress } = {}) => {
      const validation = validateFile(file, 'image');
      if (!validation.valid) return { error: { message: validation.error } };

      try {
        const { error: uploadError } = await storageService.uploadCandidateCover(
          userId,
          file,
          profile?.cover_path,
          { onProgress },
        );
        if (uploadError) return { error: friendlyProfileError(uploadError) };

        return updateBasicInfo({ cover_path: candidateCoverPath(userId) });
      } catch (uploadError) {
        return { error: { message: uploadError.message || 'No se pudo subir la portada.' } };
      }
    },
    [userId, profile?.cover_path, updateBasicInfo],
  );

  const removeCover = useCallback(async () => {
    if (!profile?.cover_path) return { error: null };

    const { error: deleteError } = await storageService.deleteCandidateCover(
      userId,
      profile.cover_path,
    );
    if (deleteError) return { error: friendlyProfileError(deleteError) };

    return updateBasicInfo({ cover_path: null });
  }, [profile?.cover_path, updateBasicInfo, userId]);

  const addExperience = useCallback(
    async (data) =>
      runMutation({
        execute: () => profileService.addExperience({ ...data, user_id: userId }),
        patchCache: (current, row) => ({
          ...current,
          experience: [...(current.experience ?? []), row],
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const updateExperience = useCallback(
    async (id, data) =>
      runMutation({
        execute: () => profileService.updateExperience(id, data),
        patchCache: (current, row) => ({
          ...current,
          experience: (current.experience ?? []).map((item) =>
            item.id === id ? { ...item, ...row } : item,
          ),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const deleteExperience = useCallback(
    async (id) =>
      runMutation({
        execute: () => profileService.deleteExperience(id),
        patchCache: (current) => ({
          ...current,
          experience: (current.experience ?? []).filter((item) => item.id !== id),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addEducation = useCallback(
    async (data) =>
      runMutation({
        execute: () => profileService.addEducation({ ...data, user_id: userId }),
        patchCache: (current, row) => ({
          ...current,
          education: [...(current.education ?? []), row],
        }),
      }),
    [runMutation, userId],
  );

  const updateEducation = useCallback(
    async (id, data) =>
      runMutation({
        execute: () => profileService.updateEducation(id, data),
        patchCache: (current, row) => ({
          ...current,
          education: (current.education ?? []).map((item) =>
            item.id === id ? { ...item, ...row } : item,
          ),
        }),
      }),
    [runMutation],
  );

  /**
   * Keep candidate_profiles.show_education_in_intro / intro_education_id
   * in sync with the education entry the user chose for the intro header.
   */
  const syncEducationIntro = useCallback(
    async (educationId, showInIntro) => {
      if (showInIntro) {
        if (!educationId) {
          return { error: { message: 'No se pudo vincular el centro a la intro.' } };
        }
        const alreadySelected =
          profile?.show_education_in_intro &&
          String(profile?.intro_education_id) === String(educationId);
        if (alreadySelected) return { error: null };

        return updateBasicInfo({
          show_education_in_intro: true,
          intro_education_id: educationId,
        });
      }

      const wasSelected = String(profile?.intro_education_id ?? '') === String(educationId ?? '');
      if (!wasSelected) return { error: null };

      return updateBasicInfo({
        show_education_in_intro: false,
        intro_education_id: null,
      });
    },
    [profile?.intro_education_id, profile?.show_education_in_intro, updateBasicInfo],
  );

  const deleteEducation = useCallback(
    async (id) => {
      const wasIntro = String(profile?.intro_education_id ?? '') === String(id);
      const result = await runMutation({
        execute: () => profileService.deleteEducation(id),
        patchCache: (current) => ({
          ...current,
          education: (current.education ?? []).filter((item) => item.id !== id),
          ...(wasIntro
            ? { show_education_in_intro: false, intro_education_id: null }
            : null),
        }),
      });

      if (!result.error && wasIntro) {
        const introResult = await updateBasicInfo({
          show_education_in_intro: false,
          intro_education_id: null,
        });
        if (introResult.error) return introResult;
      }

      return { error: result.error };
    },
    [profile?.intro_education_id, runMutation, updateBasicInfo],
  );

  const addCertification = useCallback(
    async (data) =>
      runMutation({
        execute: () => profileService.addCertification({ ...data, user_id: userId }),
        patchCache: (current, row) => ({
          ...current,
          certifications: [...(current.certifications ?? []), row],
        }),
      }),
    [runMutation, userId],
  );

  const updateCertification = useCallback(
    async (id, data) =>
      runMutation({
        execute: () => profileService.updateCertification(id, data),
        patchCache: (current, row) => ({
          ...current,
          certifications: (current.certifications ?? []).map((item) =>
            item.id === id ? { ...item, ...row } : item,
          ),
        }),
      }),
    [runMutation],
  );

  const deleteCertification = useCallback(
    async (id) => {
      const existing = (profile?.certifications ?? []).find((item) => item.id === id);
      const imagePath = existing?.image_path;

      const result = await runMutation({
        execute: () => profileService.deleteCertification(id),
        patchCache: (current) => ({
          ...current,
          certifications: (current.certifications ?? []).filter((item) => item.id !== id),
        }),
      });

      if (!result.error && imagePath && userId) {
        await storageService.deleteCertificationImage(userId, id, imagePath);
      }

      return result;
    },
    [profile?.certifications, runMutation, userId],
  );

  const addSkill = useCallback(
    async (name) =>
      runMutation({
        execute: () => profileService.addSkill({ user_id: userId, name }),
        patchCache: (current, row) => ({
          ...current,
          skills: [...(current.skills ?? []), row].filter(Boolean),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const deleteSkill = useCallback(
    async (id) =>
      runMutation({
        execute: () => profileService.deleteSkill(id),
        patchCache: (current) => ({
          ...current,
          skills: (current.skills ?? []).filter((item) => item.id !== id),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addService = useCallback(
    async (name) =>
      runMutation({
        execute: () => profileService.addService({ user_id: userId, name }),
        patchCache: (current, row) => ({
          ...current,
          services: [...(current.services ?? []), row],
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const deleteService = useCallback(
    async (id) =>
      runMutation({
        execute: () => profileService.deleteService(id),
        patchCache: (current) => ({
          ...current,
          services: (current.services ?? []).filter((item) => item.id !== id),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addLanguage = useCallback(
    async (data) =>
      runMutation({
        execute: () => profileService.addLanguage({ ...data, user_id: userId }),
        patchCache: (current, row) => ({
          ...current,
          languages: [...(current.languages ?? []), row],
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const updateLanguage = useCallback(
    async (id, data) =>
      runMutation({
        execute: () => profileService.updateLanguage(id, data),
        patchCache: (current, row) => ({
          ...current,
          languages: (current.languages ?? []).map((item) =>
            item.id === id ? { ...item, ...row } : item,
          ),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const deleteLanguage = useCallback(
    async (id) =>
      runMutation({
        execute: () => profileService.deleteLanguage(id),
        patchCache: (current) => ({
          ...current,
          languages: (current.languages ?? []).filter((item) => item.id !== id),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const addCandidateLink = useCallback(
    async (data) =>
      runMutation({
        execute: () => profileService.addCandidateLink({ ...data, user_id: userId }),
        patchCache: (current, row) => ({
          ...current,
          candidate_links: [...(current.candidate_links ?? []), row],
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const updateCandidateLink = useCallback(
    async (id, data) =>
      runMutation({
        execute: () => profileService.updateCandidateLink(id, data),
        patchCache: (current, row) => ({
          ...current,
          candidate_links: (current.candidate_links ?? []).map((item) =>
            item.id === id ? { ...item, ...row } : item,
          ),
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const deleteCandidateLink = useCallback(
    async (id) =>
      runMutation({
        execute: () => profileService.deleteCandidateLink(id),
        patchCache: (current) => ({
          ...current,
          candidate_links: (current.candidate_links ?? []).filter((item) => item.id !== id),
        }),
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
    uploadCover,
    removeCover,
    saveCoverLetter,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    syncEducationIntro,
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
