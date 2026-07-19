import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** Minimum time in background before checking for updates again. */
export const PWA_BACKGROUND_MIN_MS = 30 * 60 * 1000;

/** Maximum interval between update checks while the app stays open. */
export const PWA_PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;

export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateSWRef = useRef(null);
  const registrationRef = useRef(null);
  const hiddenAtRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        registrationRef.current = registration ?? null;
      },
      onRegisterError(error) {
        console.warn('[PWA] Service worker registration failed:', error);
      },
    });

    updateSWRef.current = updateSW;

    return () => {
      updateSWRef.current = null;
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

  const applyUpdate = useCallback(async () => {
    const updateSW = updateSWRef.current;
    if (!updateSW) return;

    setIsUpdating(true);
    try {
      await updateSW(true);
    } catch {
      setIsUpdating(false);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return {
    needRefresh,
    isUpdating,
    applyUpdate,
    dismissUpdate,
  };
}
