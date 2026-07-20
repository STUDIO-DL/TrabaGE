import { useCallback, useEffect, useState } from 'react';
import { discoverService } from '../services/discover.service';

export function useDiscoverHub() {
  const [counts, setCounts] = useState({});
  const [hiringPreview, setHiringPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [summaryResult, hiringResult] = await Promise.all([
      discoverService.getHubSummary(),
      discoverService.getHiringCompaniesPreview(6),
    ]);

    if (summaryResult.error || hiringResult.error) {
      setError(summaryResult.error?.message ?? hiringResult.error?.message ?? 'Error al cargar');
    }

    setCounts(summaryResult.counts ?? {});
    setHiringPreview(hiringResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { counts, hiringPreview, loading, error, refetch: load };
}
