import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { applicationsService } from '../services/applications.service';
import { ROLES, isEmployerRole } from '../constants/roles';
import { getPreviewApplications } from '../constants/preview';
import { supabase } from '../config/supabase';

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
      isEmployerRole(role)
        ? await applicationsService.getJobApplicants(user.id)
        : await applicationsService.getCandidateApplications(user.id);

    setApplications(data ?? []);
    setError(fetchError?.message ?? null);
    setLoading(false);
  }, [user?.id, role, isPreviewMode]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    if (!user?.id || isPreviewMode) return undefined;

    const changesConfig = {
      event: '*',
      schema: 'public',
      table: 'applications',
      ...(role === ROLES.PERSONAL ? { filter: `candidate_id=eq.${user.id}` } : {}),
    };

    const channel = supabase
      .channel(`applications-${role}-${user.id}`)
      .on('postgres_changes', changesConfig, () => {
        fetchApplications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApplications, isPreviewMode, role, user?.id]);

  return { applications, loading, error, refetch: fetchApplications };
}
