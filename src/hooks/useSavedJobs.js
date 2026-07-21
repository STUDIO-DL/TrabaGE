import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { jobsService } from '../services/jobs.service';

export function useSavedJobs({ loadJobs = false } = {}) {
  const { user, isPreviewMode } = useAuth();
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const userId = user?.id;

  const fetchSavedJobs = useCallback(async () => {
    if (!userId || isPreviewMode) {
      setSavedJobIds(new Set());
      setSavedJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = loadJobs
      ? await jobsService.getSavedJobs(userId)
      : await jobsService.getSavedJobIds(userId);

    if (result.error) {
      setError('No se pudieron cargar los empleos guardados.');
      // Keep last good saved state on transient fetch failures.
      setLoading(false);
      return;
    }

    const rows = result.data ?? [];
    setSavedJobs(loadJobs ? rows.map((row) => ({ ...row.jobs, saved_at: row.created_at })) : []);
    setSavedJobIds(new Set(rows.map((row) => row.job_id ?? row.jobs?.id).filter(Boolean)));
    setLoading(false);
  }, [isPreviewMode, loadJobs, userId]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const toggleSavedJob = useCallback(
    async (jobId) => {
      if (!userId || isPreviewMode || !jobId || actionLoadingId) {
        return { ok: false, message: 'Inicia sesión para guardar empleos.' };
      }

      const wasSaved = savedJobIds.has(jobId);
      const nextIds = new Set(savedJobIds);
      if (wasSaved) nextIds.delete(jobId);
      else nextIds.add(jobId);

      setActionLoadingId(jobId);
      setSavedJobIds(nextIds);

      const { error: saveError } = wasSaved
        ? await jobsService.removeSavedJob(userId, jobId)
        : await jobsService.saveJob(userId, jobId);

      if (saveError) {
        setSavedJobIds(savedJobIds);
        setActionLoadingId(null);
        return {
          ok: false,
          message: wasSaved
            ? 'No se pudo quitar de guardados.'
            : 'No se pudo guardar el empleo.',
        };
      }

      if (loadJobs) await fetchSavedJobs();
      setActionLoadingId(null);
      return {
        ok: true,
        saved: !wasSaved,
        message: wasSaved ? 'Empleo quitado de guardados.' : 'Empleo guardado.',
      };
    },
    [actionLoadingId, fetchSavedJobs, isPreviewMode, loadJobs, savedJobIds, userId],
  );

  return useMemo(
    () => ({
      savedJobIds,
      savedJobs,
      loading,
      error,
      actionLoadingId,
      isSaved: (jobId) => savedJobIds.has(jobId),
      toggleSavedJob,
      refetch: fetchSavedJobs,
    }),
    [actionLoadingId, error, fetchSavedJobs, loading, savedJobIds, savedJobs, toggleSavedJob],
  );
}
