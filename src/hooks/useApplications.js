import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { applicationsService } from '../services/applications.service';
import { ROLES } from '../constants/roles';
import { getPreviewApplications } from '../constants/preview';

export function useApplications() {
  const { user, role, isPreviewMode } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    if (isPreviewMode) {
      setApplications(getPreviewApplications(role));
      setError(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } =
      role === ROLES.COMPANY
        ? await applicationsService.getJobApplicants(user.id)
        : await applicationsService.getCandidateApplications(user.id);

    setApplications(data ?? []);
    setError(fetchError?.message ?? null);
    setLoading(false);
  }, [user?.id, role, isPreviewMode]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return { applications, loading, error, refetch: fetchApplications };
}
