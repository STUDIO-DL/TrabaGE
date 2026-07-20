import { useCallback, useEffect, useState, useRef } from 'react';
import { jobsService } from '../services/jobs.service';

export function useJobs(filters = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const jobsRef = useRef([]);
  jobsRef.current = jobs;

  const fetchJobs = useCallback(async () => {
    const hasExisting = jobsRef.current.length > 0;
    if (!hasExisting) setLoading(true);
    setError(null);
    const { data, error: fetchError } = await jobsService.getActiveJobs(filters);
    if (fetchError) {
      setError(fetchError?.message ?? null);
      if (!hasExisting) setJobs([]);
      setLoading(false);
      return;
    }
    setJobs(data ?? []);
    setError(null);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}

export function useJob(jobId, { viewerId = null } = {}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    jobsService.getJobById(jobId).then(({ data, error: fetchError }) => {
      const visible =
        data && (data.status === 'active' || (viewerId && data.company_id === viewerId));
      setJob(visible ? data : null);
      setError(fetchError?.message ?? null);
      setLoading(false);
    });
  }, [jobId, viewerId]);

  return { job, loading, error };
}
