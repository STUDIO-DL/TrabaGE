import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { companyAnalyticsService } from './companyAnalytics.service';
import { resolveCompanyAnalyticsPeriod } from './companyAnalyticsPeriods';
import { toUserFacingError, ERROR_ACTION } from '../../utils/userFacingError';

const DEFAULT_JOBS_PAGE = 10;
const REFRESH_MS = 60_000;

export function useCompanyAnalyticsBundle({
  periodId = '30d',
  jobsOffset = 0,
  jobsLimit = DEFAULT_JOBS_PAGE,
} = {}) {
  const range = useMemo(() => resolveCompanyAnalyticsPeriod(periodId), [periodId]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const queryKeyRef = useRef('');
  const hasDataRef = useRef(false);

  const reload = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const queryKey = `${range.from}|${range.to}|${jobsLimit}|${jobsOffset}`;
    const filterChanged = queryKeyRef.current !== queryKey;
    if (filterChanged) {
      queryKeyRef.current = queryKey;
      hasDataRef.current = false;
    }
    const soft = hasDataRef.current && !filterChanged;

    const load = async () => {
      if (!soft) setLoading(true);
      setError(null);
      const result = await companyAnalyticsService.getBundle({
        from: range.from,
        to: range.to,
        jobsLimit,
        jobsOffset,
      });
      if (cancelled) return;
      if (result.error) {
        if (!soft) setData(null);
        const mapped = toUserFacingError(result.error, {
          action: ERROR_ACTION.load,
          log: true,
          context: { area: 'company_analytics' },
        });
        setError(mapped.message);
      } else {
        const repostResult = await companyAnalyticsService.getRepostStats({
          from: range.from,
          to: range.to,
        });
        const repostStats = repostResult.data ?? {};
        const bundle = result.data ?? {};
        setData({
          ...bundle,
          posts: {
            ...(bundle.posts ?? {}),
            reposts: Number(repostStats.reposts) || 0,
            repost_reach: Number(repostStats.reach) || 0,
            views_from_reposts: Number(repostStats.views_from_reposts) || 0,
          },
        });
        hasDataRef.current = true;
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, jobsLimit, jobsOffset, refreshTick]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setRefreshTick((n) => n + 1);
      }
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return {
    data,
    loading,
    error,
    reload,
    range,
    periodId,
  };
}
