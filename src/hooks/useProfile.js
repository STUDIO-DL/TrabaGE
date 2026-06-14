import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { ROLES } from '../constants/roles';

export function useProfile(userId) {
  const { user, role } = useAuth();
  const targetId = userId || user?.id;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);

    const isCandidate = userId ? true : role !== ROLES.COMPANY;
    const { data, error: fetchError } = isCandidate
      ? await profileService.getCandidateFullProfile(targetId)
      : await companyService.getCompanyProfile(targetId);

    setProfile(data);
    setError(fetchError?.message ?? null);
    setLoading(false);
  }, [targetId, role]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
