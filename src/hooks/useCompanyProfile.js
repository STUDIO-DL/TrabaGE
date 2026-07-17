import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { refetchProfileCache, useProfile } from './useProfile';
import { companyService } from '../services/company.service';
import { storageService } from '../services/storage.service';
import { compressProfileImage } from '../utils/imageCompression';
import { validateFile } from '../utils/validateFile';
import { logoPath, companyCoverPath } from '../constants/storage';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors';
import {
  applyOptimisticUpdate,
  getCacheKey,
  mergeProfileCache,
} from '../services/profileCache';
import { isEmployerRole } from '../constants/roles';

function friendlyCompanyError(error) {
  if (!error) return null;
  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('violates row-level security')) {
    return { ...error, message: 'No tienes permisos para modificar este dato.' };
  }

  return { ...error, message: getSupabaseErrorMessage(error) };
}

export function useCompanyProfile() {
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
    return refetchProfileCache(ownCacheKey, () => companyService.getCompanyProfile(userId));
  }, [ownCacheKey, userId]);

  const runMutation = useCallback(
    async ({ optimistic, execute, mergeResult, resync = true }) => {
      const rollback = optimistic && ownCacheKey ? applyOptimisticUpdate(ownCacheKey, optimistic) : null;

      try {
        const result = await execute();
        if (result?.error) {
          rollback?.();
          await syncFullProfile();
          return { data: result.data ?? null, error: friendlyCompanyError(result.error) };
        }

        if (ownCacheKey && mergeResult) {
          const patch = mergeResult(result);
          if (patch) mergeProfileCache(ownCacheKey, patch);
        }

        if (resync) {
          void syncFullProfile();
        }

        return { data: result?.data ?? null, error: null };
      } catch (mutationError) {
        rollback?.();
        await syncFullProfile();
        return { data: null, error: friendlyCompanyError(mutationError) };
      }
    },
    [ownCacheKey, syncFullProfile],
  );

  const updateCompanyProfile = useCallback(
    async (data, { companyNameFallback } = {}) =>
      runMutation({
        optimistic: data,
        execute: () =>
          companyService.upsertCompanyProfile({
            user_id: userId,
            company_name:
              data.company_name
              || profile?.company_name?.trim()
              || companyNameFallback
              || 'Empresa',
            ...data,
          }),
        mergeResult: (result) => result.data ?? data,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [profile?.company_name, runMutation, userId],
  );

  const uploadLogo = useCallback(
    async (file) => {
      const validation = validateFile(file, 'logo');
      if (!validation.valid) return { error: { message: validation.error } };

      let compressed;
      try {
        compressed = await compressProfileImage(file);
      } catch (compressError) {
        return { error: { message: compressError.message } };
      }

      const { error: uploadError } = await storageService.uploadCompanyLogo(
        userId,
        compressed,
        profile?.logo_path,
      );
      if (uploadError) return { error: friendlyCompanyError(uploadError) };

      return updateCompanyProfile({ logo_path: logoPath(userId) });
    },
    [profile?.logo_path, updateCompanyProfile, userId],
  );

  const uploadCover = useCallback(
    async (file) => {
      const validation = validateFile(file, 'image');
      if (!validation.valid) return { error: { message: validation.error } };

      let compressed;
      try {
        compressed = await compressProfileImage(file);
      } catch (compressError) {
        return { error: { message: compressError.message } };
      }

      const { error: uploadError } = await storageService.uploadCompanyCover(
        userId,
        compressed,
        profile?.cover_url,
      );
      if (uploadError) return { error: friendlyCompanyError(uploadError) };

      return updateCompanyProfile({ cover_url: companyCoverPath(userId) });
    },
    [profile?.cover_url, updateCompanyProfile, userId],
  );

  const addCompanyService = useCallback(
    async (name) =>
      runMutation({
        execute: () => companyService.addCompanyService({ company_id: userId, name }),
        mergeResult: (result) =>
          result.data
            ? { company_services: [...(profile?.company_services ?? []), result.data] }
            : null,
      }).then(({ error: saveError }) => ({ error: saveError })),
    [profile?.company_services, runMutation, userId],
  );

  const deleteCompanyService = useCallback(
    async (id) =>
      runMutation({
        optimistic: (current) => ({
          company_services: (current.company_services ?? []).filter((item) => item.id !== id),
        }),
        execute: () => companyService.deleteCompanyService(id),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation],
  );

  const saveContact = useCallback(
    async (contactData, { companyNameFallback } = {}) =>
      updateCompanyProfile(contactData, { companyNameFallback }),
    [updateCompanyProfile],
  );

  return {
    profile,
    loading,
    error,
    refetch,
    updateCompanyProfile,
    uploadLogo,
    uploadCover,
    addCompanyService,
    deleteCompanyService,
    saveContact,
  };
}
