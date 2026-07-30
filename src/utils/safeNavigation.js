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
