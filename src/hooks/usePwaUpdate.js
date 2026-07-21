import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { isNativeFilePickActive } from '../utils/appLifecycle';
import { clearChunkReloadGuard } from '../utils/chunkRecovery';

/** Minimum time in background before checking for updates again. */
export const PWA_BACKGROUND_MIN_MS = 30 * 60 * 1000;

/** Maximum interval between update checks while the app stays open. */
export const PWA_PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000;

/** How long "Más tarde" snoozes the update banner. */
const PWA_DISMISS_SNOOZE_MS = 60 * 60 * 1000;
const PWA_DISMISS_UNTIL_KEY = 'trabage_pwa_dismiss_until';

function readDismissUntil() {
  try {
    return Number(localStorage.getItem(PWA_DISMISS_UNTIL_KEY) || 0);
  } catch {
    return 0;
  }
}

function writeDismissUntil(until) {
  try {
    localStorage.setItem(PWA_DISMISS_UNTIL_KEY, String(until));
  } catch {
    // Ignore.
  }
}

function clearDismissUntil() {
  try {
    localStorage.removeItem(PWA_DISMISS_UNTIL_KEY);
  } catch {
    // Ignore.
  }
}

export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateSWRef = useRef(null);
  const registrationRef = useRef(null);
  const hiddenAtRef = useRef(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return undefined;
    }

    // Successful boot after a chunk recovery — allow another auto-reload later.
    clearChunkReloadGuard();

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        pendingRefreshRef.current = true;
        if (readDismissUntil() > Date.now()) {
          setNeedRefresh(false);
          return;
        }
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

      // Returning from the OS file picker is not a long-background update check.
      if (isNativeFilePickActive()) {
        hiddenAtRef.current = null;
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;

      if (Date.now() - hiddenAt >= PWA_BACKGROUND_MIN_MS) {
        checkForUpdates();
      }

      // Re-show banner after snooze expires if an update is still pending.
      if (pendingRefreshRef.current && readDismissUntil() <= Date.now()) {
        clearDismissUntil();
        setNeedRefresh(true);
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
    clearDismissUntil();
    try {
      await updateSW(true);
    } catch {
      setIsUpdating(false);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    writeDismissUntil(Date.now() + PWA_DISMISS_SNOOZE_MS);
    setNeedRefresh(false);
  }, []);

  return {
    needRefresh,
    isUpdating,
    applyUpdate,
    dismissUpdate,
  };
}
