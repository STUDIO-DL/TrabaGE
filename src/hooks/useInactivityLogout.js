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
 * Signs the user out after prolonged inactivity. Background time does not count —
 * the timer pauses while the document is hidden so returning within 5 minutes never
 * triggers logout. Form drafts in localStorage are preserved on timeout logout.
 */
export function useInactivityLogout({ enabled, onTimeout, timeoutMs = INACTIVITY_TIMEOUT_MS }) {
  const timerRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());
  const hiddenAtRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return undefined;
    }

    const scheduleCheck = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);

      const elapsed = Date.now() - lastActivityAtRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        onTimeoutRef.current?.();
        return;
      }

      timerRef.current = window.setTimeout(() => {
        if (Date.now() - lastActivityAtRef.current >= timeoutMs) {
          onTimeoutRef.current?.();
        } else {
          scheduleCheck();
        }
      }, remaining);
    };

    const resetTimer = () => {
      lastActivityAtRef.current = Date.now();
      scheduleCheck();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        hiddenAtRef.current = Date.now();
        // #region agent log
        fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'D',location:'useInactivityLogout.js:hidden',message:'tab hidden — timer paused',data:{lastActivityAt:lastActivityAtRef.current,elapsedMs:Date.now()-lastActivityAtRef.current,timeoutMs},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return;
      }

      // Exclude wall-clock time spent in background from the idle clock.
      if (hiddenAtRef.current != null) {
        const backgroundMs = Date.now() - hiddenAtRef.current;
        lastActivityAtRef.current += backgroundMs;
        hiddenAtRef.current = null;
      }

      const elapsedOnVisible = Date.now() - lastActivityAtRef.current;
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'D',location:'useInactivityLogout.js:visible',message:'tab visible — background excluded from idle',data:{elapsedOnVisible,wouldLogout:elapsedOnVisible>=timeoutMs,timeoutMs},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      scheduleCheck();
    };

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, timeoutMs]);
}
