import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { companyService } from '../services/company.service';
import { storageService } from '../services/storage.service';
import { compressProfileImage } from '../utils/imageCompression';
import { validateFile } from '../utils/validateFile';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors';
import { syncAuthIdentityMetadata, readIdentityFromUser } from '../utils/displayIdentity';
import { getOwnCompanyProfileKey, getProfileQueryKey } from '../constants/profileQueryKeys';
import { withSetupComplete } from '../utils/profilePersistence';
import { logoPath, companyCoverPath } from '../constants/storage';

function friendlyCompanyError(error) {
  if (!error) return null;
  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('violates row-level security')) {
    return { ...error, message: 'No tienes permisos para modificar este dato.' };
  }
  if (error.code === 'WRITE_NO_ROW') {
    return error;
  }

  return { ...error, message: getSupabaseErrorMessage(error) };
}

function mergeBaseProfileRow(current, row) {
  if (!row) return current ?? null;
  if (!current) return row;
  return { ...current, ...row };
}

export function useCompanyProfile() {
  const queryClient = useQueryClient();
  const { user, role, isPreviewMode, refreshSetupStatus } = useAuth();
  const { profile, loading, error, refetch, queryKey } = useProfile();
  const nameHydratedRef = useRef(false);

  const userId = user?.id;
  const ownQueryKey =
    queryKey ??
    getProfileQueryKey(userId, {
      role,
      isPreviewMode,
      viewingOtherCandidate: false,
      viewingOtherCompany: false,
    }) ??
    getOwnCompanyProfileKey(userId);

  const syncFullProfile = useCallback(async () => {
    if (!ownQueryKey) return null;
    await queryClient.invalidateQueries({ queryKey: ownQueryKey });
    const result = await refetch();
    return result.data ?? null;
  }, [ownQueryKey, queryClient, refetch]);

  const invalidateProfileQueries = useCallback(async () => {
    if (!userId) return null;
    await queryClient.invalidateQueries({ queryKey: ['profile', 'public', 'company', userId] });
    return syncFullProfile();
  }, [queryClient, syncFullProfile, userId]);

  const runMutation = useCallback(
    async ({ execute, patchCache, resync = true }) => {
      try {
        const result = await execute();
        if (result?.error) {
          await syncFullProfile();
          return { data: result.data ?? null, error: friendlyCompanyError(result.error) };
        }

        if (ownQueryKey && patchCache) {
          queryClient.setQueryData(ownQueryKey, (current) => patchCache(current, result.data));
        } else if (ownQueryKey && result.data) {
          queryClient.setQueryData(ownQueryKey, (current) =>
            mergeBaseProfileRow(current, result.data),
          );
        }

        if (resync) {
          await invalidateProfileQueries();
        }

        return { data: result?.data ?? null, error: null };
      } catch (mutationError) {
        await syncFullProfile();
        return { data: null, error: friendlyCompanyError(mutationError) };
      }
    },
    [invalidateProfileQueries, ownQueryKey, queryClient, syncFullProfile],
  );

  const updateCompanyProfile = useCallback(
    async (data, { companyNameFallback } = {}) => {
      const payload = withSetupComplete(role, profile, {
        ...(data.company_name
          ? data
          : { ...data, company_name: profile?.company_name?.trim() || companyNameFallback || undefined }),
      });

      const { error: saveError } = await runMutation({
        execute: () => companyService.updateCompanyProfile(userId, payload),
        patchCache: (current, row) => mergeBaseProfileRow(current, row),
      }).then(({ error }) => ({ error }));

      if (!saveError && (data.company_name || profile?.company_name)) {
        void syncAuthIdentityMetadata({
          company_name: data.company_name || profile?.company_name,
        });
      }

      if (!saveError) {
        void refreshSetupStatus();
      }

      return { error: saveError };
    },
    [profile, refreshSetupStatus, role, runMutation, userId],
  );

  useEffect(() => {
    if (isPreviewMode || nameHydratedRef.current || !userId || !user || loading) return;
    if (profile?.company_name?.trim()) return;

    const identityName = readIdentityFromUser(user).company_name;
    if (!identityName) return;

    nameHydratedRef.current = true;
    void updateCompanyProfile({ company_name: identityName }, { companyNameFallback: identityName });
  }, [isPreviewMode, loading, profile?.company_name, updateCompanyProfile, user, userId]);

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

      const companyNameFallback =
        profile?.company_name?.trim() || readIdentityFromUser(user).company_name || undefined;

      return updateCompanyProfile(
        { logo_path: logoPath(userId) },
        { companyNameFallback },
      );
    },
    [profile?.company_name, profile?.logo_path, updateCompanyProfile, user, userId],
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
        profile?.cover_path ?? profile?.cover_url,
      );
      if (uploadError) return { error: friendlyCompanyError(uploadError) };

      return updateCompanyProfile({ cover_path: companyCoverPath(userId) });
    },
    [profile?.cover_path, profile?.cover_url, updateCompanyProfile, userId],
  );

  const addCompanyService = useCallback(
    async (name) =>
      runMutation({
        execute: () => companyService.addCompanyService({ company_id: userId, name }),
        patchCache: (current, row) => ({
          ...current,
          company_services: [...(current.company_services ?? []), row],
        }),
      }).then(({ error: saveError }) => ({ error: saveError })),
    [runMutation, userId],
  );

  const deleteCompanyService = useCallback(
    async (id) =>
      runMutation({
        execute: () => companyService.deleteCompanyService(id),
        patchCache: (current) => ({
          ...current,
          company_services: (current.company_services ?? []).filter((item) => item.id !== id),
        }),
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
