import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { loadScrollPosition, saveScrollPosition } from '../utils/scrollPositionStore';

/**
 * Remembers window scroll per route and restores it when navigating back.
 * Does not fight chat/conversation containers that manage their own scroll.
 */
export function useScrollRestoration() {
  const location = useLocation();
  const pathRef = useRef(location.pathname + location.search);
  const restorePendingRef = useRef(true);

  useEffect(() => {
    const prevPath = pathRef.current;
    const nextPath = location.pathname + location.search;

    if (prevPath !== nextPath) {
      saveScrollPosition(prevPath, window.scrollY || document.documentElement.scrollTop || 0);
      pathRef.current = nextPath;
      restorePendingRef.current = true;
    }

    if (!restorePendingRef.current) return undefined;

    const y = loadScrollPosition(nextPath);
    if (y == null) {
      restorePendingRef.current = false;
      return undefined;
    }

    let cancelled = false;
    const restore = () => {
      if (cancelled) return;
      window.scrollTo(0, y);
      restorePendingRef.current = false;
    };

    // Wait a frame so route content can mount before restoring.
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });
    const timer = window.setTimeout(restore, 120);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const persist = () => {
      const path = pathRef.current;
      saveScrollPosition(path, window.scrollY || document.documentElement.scrollTop || 0);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };

    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      persist();
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

export function ScrollRestoration() {
  useScrollRestoration();
  return null;
}
