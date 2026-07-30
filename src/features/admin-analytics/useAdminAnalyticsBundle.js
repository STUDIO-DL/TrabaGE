import { useEffect, useState } from 'react';
import { adminAnalyticsService } from './adminAnalytics.service';
import { useAnalyticsFilters } from './AnalyticsFiltersContext';
import { toUserFacingError, ERROR_ACTION } from '../../utils/userFacingError';

export function useAdminAnalyticsBundle() {
  const { rpcFilters } = useAnalyticsFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [technical, setTechnical] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setTechnical(null);
      const result = await adminAnalyticsService.getBundle(rpcFilters);
      if (cancelled) return;
      if (result.error) {
        setData(null);
        const mapped = toUserFacingError(result.error, {
          action: ERROR_ACTION.analytics,
          log: true,
          context: { area: 'admin_analytics' },
        });
        setError(mapped.message);
        setTechnical(mapped.technical);
      } else {
        setData(result.data);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    rpcFilters.from,
    rpcFilters.to,
    rpcFilters.city,
    rpcFilters.sector,
    rpcFilters.accountRole,
    rpcFilters.jobType,
    rpcFilters.workMode,
  ]);

  return { data, loading, error, technical, reloadKey: rpcFilters };
}
