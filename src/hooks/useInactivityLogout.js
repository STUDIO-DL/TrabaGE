import { useEffect, useRef } from 'react';

/** 5 minutes of real inactivity before controlled logout. */
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'pointerdown',
];

/**
 * Signs the user out after prolonged inactivity. Form drafts in localStorage
 * are preserved — callers should not clear them on timeout logout.
 */
export function useInactivityLogout({ enabled, onTimeout, timeoutMs = INACTIVITY_TIMEOUT_MS }) {
  const timerRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return undefined;
    }

    const resetTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        onTimeoutRef.current?.();
      }, timeoutMs);
    };

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [enabled, timeoutMs]);
}
