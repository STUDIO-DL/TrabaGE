import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { mergeOwnCandidateProfile, useProfile } from './useProfile';
import { profileService } from '../services/profile.service';
import { storageService } from '../services/storage.service';
import { jobMatchesService } from '../services/jobMatches.service';
import { cvPath, avatarPath } from '../constants/storage';
import { compressProfileImage } from '../utils/imageCompression';
import { validateFile } from '../utils/validateFile';
import { reportError } from '../utils/logger';

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
  const { user } = useAuth();
  const { profile, loading, error, refetch } = useProfile();

  const userId = user?.id;

  const afterCandidateProfileChanged = useCallback(async () => {
    await refetch();
    if (userId) {
      jobMatchesService.recalculateForCandidate(userId).catch((recalcError) => {
        reportError(recalcError, { area: 'candidate_match_recalculation', userId });
      });
    }
  }, [refetch, userId]);

  const updateBasicInfo = useCallback(
    async (data) => {
      mergeOwnCandidateProfile(userId, data);
      const { error: saveError } = await profileService.updateCandidateProfile(userId, data);
      if (!saveError) {
        await afterCandidateProfileChanged();
      } else {
        await refetch();
      }
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, refetch, userId],
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
    async (text) => {
      return updateBasicInfo({ cover_letter: text?.trim() || null });
    },
    [updateBasicInfo],
  );

  const addExperience = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addExperience({ ...data, user_id: userId });
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const updateExperience = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateExperience(id, data);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const deleteExperience = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteExperience(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const addEducation = useCallback(
    async (data) => {
      const { data: saved, error: saveError } = await profileService.addEducation({
        ...data,
        user_id: userId,
      });
      if (!saveError) await afterCandidateProfileChanged();
      return { data: saved, error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const updateEducation = useCallback(
    async (id, data) => {
      const { data: saved, error: saveError } = await profileService.updateEducation(id, data);
      if (!saveError) await afterCandidateProfileChanged();
      return { data: saved, error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const deleteEducation = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteEducation(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const addCertification = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addCertification({ ...data, user_id: userId });
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const updateCertification = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateCertification(id, data);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const deleteCertification = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteCertification(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const addSkill = useCallback(
    async (name) => {
      const { error: saveError } = await profileService.addSkill({ user_id: userId, name });
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const deleteSkill = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteSkill(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const addService = useCallback(
    async (name) => {
      const { error: saveError } = await profileService.addService({ user_id: userId, name });
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const deleteService = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteService(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const addLanguage = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addLanguage({ ...data, user_id: userId });
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const updateLanguage = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateLanguage(id, data);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const deleteLanguage = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteLanguage(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const addCandidateLink = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addCandidateLink({ ...data, user_id: userId });
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged, userId],
  );

  const updateCandidateLink = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateCandidateLink(id, data);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
  );

  const deleteCandidateLink = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteCandidateLink(id);
      if (!saveError) await afterCandidateProfileChanged();
      return { error: friendlyProfileError(saveError) };
    },
    [afterCandidateProfileChanged],
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
