import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { ROLES } from '../constants/roles';
import { getPreviewApplicantProfile, getPreviewProfile, PREVIEW_USER } from '../constants/preview';

export function useProfile(userId) {
  const { user, role, isPreviewMode } = useAuth();
  const targetId = userId || user?.id;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setProfile(getPreviewProfile(ROLES.COMPANY));
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

    setLoading(true);
    setError(null);

    const isCandidate = userId ? true : role !== ROLES.COMPANY;
    const { data, error: fetchError } = isCandidate
      ? await profileService.getCandidateFullProfile(targetId)
      : await companyService.getCompanyProfile(targetId);

    setProfile(data);
    setError(fetchError?.message ?? null);
    setLoading(false);
  }, [targetId, role, userId, isPreviewMode]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
