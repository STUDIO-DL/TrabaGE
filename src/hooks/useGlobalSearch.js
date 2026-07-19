import { useEffect, useRef, useState } from 'react';
import { searchService } from '../services/search.service';
import { jobsService } from '../services/jobs.service';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { ROLES, isEmployerRole } from '../constants/roles';

const DEBOUNCE_MS = 300;

export function useGlobalSearch(
  query,
  { enabled = true, limitPerType = 5, includeJobs = false } = {},
) {
  const { user, role } = useAuth();
  const { profile } = useProfile();
  const [companyJobs, setCompanyJobs] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isEmployerRole(role) || !user?.id) {
      setCompanyJobs([]);
      return;
    }

    jobsService.getCompanyJobs(user.id).then(({ data }) => {
      setCompanyJobs((data ?? []).filter((job) => job.status === 'active'));
    });
  }, [role, user?.id]);

  useEffect(() => {
    const trimmed = query?.trim() ?? '';

    if (!enabled || !trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    const matchingContext =
      role === ROLES.PERSONAL && profile
        ? { userProfile: profile }
        : isEmployerRole(role) && companyJobs.length
          ? { companyJobs }
          : null;

    const timer = window.setTimeout(async () => {
      const { data, error: searchError } = await searchService.globalSearch({
        query: trimmed,
        limitPerType,
        user: user ? { id: user.id, role } : null,
        matchingContext,
        includeJobs,
      });

      if (requestIdRef.current !== requestId) return;

      if (searchError) {
        setResults([]);
        setError(searchError.message ?? 'No se pudo completar la búsqueda.');
      } else {
        setResults(data || []);
        setError(null);
      }
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [companyJobs, profile, query, enabled, limitPerType, includeJobs, user, role]);

  return { results, loading, error };
}
