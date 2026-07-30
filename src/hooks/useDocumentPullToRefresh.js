import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const PULL_THRESHOLD_PX = 68;
const PULL_MAX_PX = 108;
const ACTIVATE_ANGLE = 1.15;

export function isInstalledPwa() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: minimal-ui)').matches
      || window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function documentScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) return true;
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [data-no-pull-refresh]',
    )
  ) {
    return true;
  }

  let node = target;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const { overflowY } = window.getComputedStyle(node);
      if (
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
        && node.scrollHeight > node.clientHeight + 1
      ) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Custom pull-to-refresh for installed PWA shells where Chrome Android
 * does not expose native PTR. Browser tabs use restored native overscroll.
 * Skips nested scrollports (chat / swipe-to-reply) and form fields.
 */
export function useDocumentPullToRefresh({ enabled } = {}) {
  const queryClient = useQueryClient();
  const active = enabled ?? isInstalledPwa();
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const stateRef = useRef(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  const setPull = useCallback((value) => {
    pullRef.current = value;
    setPullPx(value);
  }, []);

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setPull(PULL_THRESHOLD_PX * 0.55);
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPull(0);
    }
  }, [queryClient, setPull]);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;

    const onTouchStart = (event) => {
      if (refreshingRef.current) return;
      if (event.touches.length !== 1) return;
      if (documentScrollTop() > 1) return;
      if (shouldIgnoreTarget(event.target)) return;

      const touch = event.touches[0];
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        locked: null,
      };
    };

    const onTouchMove = (event) => {
      const state = stateRef.current;
      if (!state || refreshingRef.current) return;
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      if (state.locked == null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        // Leave horizontal / upward gestures to the page (swipe-to-reply, scroll).
        if (Math.abs(dx) * ACTIVATE_ANGLE >= Math.abs(dy) || dy < 0) {
          state.locked = 'other';
          setPull(0);
          return;
        }
        if (documentScrollTop() > 1) {
          state.locked = 'other';
          return;
        }
        state.locked = 'pull';
      }

      if (state.locked !== 'pull') return;

      const distance = Math.min(PULL_MAX_PX, Math.max(0, dy * 0.45));
      setPull(distance);
      if (distance > 0 && event.cancelable) {
        event.preventDefault();
      }
    };

    const endGesture = () => {
      const state = stateRef.current;
      stateRef.current = null;
      if (!state || state.locked !== 'pull') {
        setPull(0);
        return;
      }
      if (pullRef.current >= PULL_THRESHOLD_PX) {
        void runRefresh();
      } else {
        setPull(0);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', endGesture, { passive: true, capture: true });
    document.addEventListener('touchcancel', endGesture, { passive: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', endGesture, true);
      document.removeEventListener('touchcancel', endGesture, true);
    };
  }, [active, runRefresh, setPull]);

  return {
    active,
    pullPx,
    refreshing,
    progress: Math.min(1, pullPx / PULL_THRESHOLD_PX),
    armed: pullPx >= PULL_THRESHOLD_PX,
  };
}

export { PULL_THRESHOLD_PX };
