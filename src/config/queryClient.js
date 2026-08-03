import { QueryClient } from '@tanstack/react-query';
import { queryRetryDelay, shouldRetryQuery } from '../utils/withRetry';
import { getConnectivityState } from '../utils/connectivity';

/**
 * Tuned for intermittent / slow networks (2G–3G, unstable Wi‑Fi):
 * - Prefer cached data first (networkMode: offlineFirst)
 * - Longer freshness window to avoid repeat Supabase round-trips
 * - No refetch on window focus (already disabled)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) => {
        if (getConnectivityState().offline) return false;
        return shouldRetryQuery(failureCount, error);
      },
      retryDelay: queryRetryDelay,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});
