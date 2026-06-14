import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { profileService } from '../services/profile.service';
import { storageService } from '../services/storage.service';

export function useCandidateProfile() {
  const { user } = useAuth();
  const { profile, loading, error, refetch } = useProfile();

  const userId = user?.id;

  const updateBasicInfo = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.updateCandidateProfile(userId, data);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [userId, refetch],
  );

  const uploadAvatar = useCallback(
    async (file) => {
      const { error: uploadError } = await storageService.uploadAvatar(userId, file);
      if (uploadError) return { error: uploadError };

      const { data: urlData } = storageService.getPublicUrl('avatars', `${userId}/avatar.jpg`);
      return updateBasicInfo({ avatar_url: urlData.publicUrl });
    },
    [userId, updateBasicInfo],
  );

  const uploadCV = useCallback(
    async (file) => {
      const { error: uploadError } = await storageService.uploadCV(userId, file);
      if (uploadError) return { error: uploadError };

      return updateBasicInfo({
        cv_url: `${userId}/cv.pdf`,
        cv_name: file.name,
      });
    },
    [userId, updateBasicInfo],
  );

  const uploadCoverLetter = useCallback(
    async (file) => {
      const { error: uploadError } = await storageService.uploadCoverLetter(userId, file);
      if (uploadError) return { error: uploadError };

      return updateBasicInfo({
        cover_letter_url: `${userId}/cover-letter.pdf`,
        cover_letter_name: file.name,
      });
    },
    [userId, updateBasicInfo],
  );

  const addExperience = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addExperience({ ...data, candidate_id: userId });
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [userId, refetch],
  );

  const updateExperience = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateExperience(id, data);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const deleteExperience = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteExperience(id);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const addEducation = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addEducation({ ...data, candidate_id: userId });
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [userId, refetch],
  );

  const updateEducation = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateEducation(id, data);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const deleteEducation = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteEducation(id);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const addCertification = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addCertification({ ...data, candidate_id: userId });
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [userId, refetch],
  );

  const updateCertification = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateCertification(id, data);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const deleteCertification = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteCertification(id);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const addSkill = useCallback(
    async (name) => {
      const { error: saveError } = await profileService.addSkill({ candidate_id: userId, name });
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [userId, refetch],
  );

  const deleteSkill = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteSkill(id);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const addLanguage = useCallback(
    async (data) => {
      const { error: saveError } = await profileService.addLanguage({ ...data, candidate_id: userId });
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [userId, refetch],
  );

  const updateLanguage = useCallback(
    async (id, data) => {
      const { error: saveError } = await profileService.updateLanguage(id, data);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  const deleteLanguage = useCallback(
    async (id) => {
      const { error: saveError } = await profileService.deleteLanguage(id);
      if (!saveError) await refetch();
      return { error: saveError };
    },
    [refetch],
  );

  return {
    profile,
    loading,
    error,
    refetch,
    updateBasicInfo,
    uploadAvatar,
    uploadCV,
    uploadCoverLetter,
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
    addLanguage,
    updateLanguage,
    deleteLanguage,
  };
}
