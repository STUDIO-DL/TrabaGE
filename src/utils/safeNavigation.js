/**
 * Only allow same-origin absolute URLs or in-app relative paths.
 * Blocks open redirects to external phishing sites.
 */
export function sanitizeAppNavigationTarget(candidate, origin = '') {
  if (!candidate || typeof candidate !== 'string') return null;

  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!baseOrigin || url.origin !== baseOrigin) return null;
      return `${url.pathname}${url.search}${url.hash}` || '/';
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function isSafeInternalPath(path) {
  if (!path || typeof path !== 'string') return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return true;
}

/**
 * Prefer real in-app history when available; otherwise use an explicit fallback.
 * Prevents exiting the app / landing on the wrong home when history is empty
 * (e.g. cold open, or a detail opened without a prior push).
 */
export function navigateBack(navigate, { fallback, replaceFallback = true } = {}) {
  const idx = typeof window !== 'undefined' ? window.history.state?.idx : undefined;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
    return;
  }

  const target = typeof fallback === 'string' ? fallback.trim() : '';
  if (target && isSafeInternalPath(target)) {
    navigate(target, { replace: replaceFallback });
    return;
  }

  navigate(-1);
}

/** Resolve a back target from route state (`from` / `backTo`) or an extra fallback. */
export function resolveBackFallback(location, extraFallback) {
  const fromState = location?.state?.from || location?.state?.backTo;
  if (typeof fromState === 'string' && isSafeInternalPath(fromState)) return fromState;
  if (typeof extraFallback === 'string' && isSafeInternalPath(extraFallback)) return extraFallback;
  return null;
}
