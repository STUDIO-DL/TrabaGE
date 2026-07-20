import { useCallback, useEffect, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** Minimum time in background before checking for updates again. */
export const PWA_BACKGROUND_MIN_MS = 30 * 60 * 1000;

/** Maximum interval between update checks while the app stays open. */
export const PWA_PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;

export function usePwaUpdate() {
  const registrationRef = useRef(null);
  const hiddenAtRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return undefined;
    }

    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        registrationRef.current = registration ?? null;
      },
      onRegisterError(error) {
        console.warn('[PWA] Service worker registration failed:', error);
      },
    });

    return () => {
      registrationRef.current = null;
    };
  }, []);

  const checkForUpdates = useCallback(() => {
    registrationRef.current?.update().catch(() => {
      // Ignore transient network errors during scheduled checks.
    });
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;

    const intervalId = window.setInterval(checkForUpdates, PWA_PERIODIC_CHECK_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState !== 'visible') return;

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;

      if (Date.now() - hiddenAt >= PWA_BACKGROUND_MIN_MS) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkForUpdates]);
}
