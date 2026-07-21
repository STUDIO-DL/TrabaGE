import { useEffect } from 'react';
import { shouldAllowForegroundRefresh } from '../utils/backgroundGracePeriod';

/**
 * Runs `onRefresh` when the tab regains focus ONLY if the app was backgrounded
 * for at least BACKGROUND_GRACE_MS. Suppresses all refreshes within the grace window.
 */
export function useForegroundResumeRefresh(onRefresh, deps = []) {
  useEffect(() => {
    if (!onRefresh) return undefined;

    const handleResume = () => {
      if (document.visibilityState !== 'visible') return;
      if (!shouldAllowForegroundRefresh()) return;
      onRefresh();
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls refresh deps
  }, deps);
}
