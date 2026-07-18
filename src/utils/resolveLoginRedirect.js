export function buildPathFromLocationState(from) {
  if (!from?.pathname) return null;
  return `${from.pathname}${from.search || ''}${from.hash || ''}`;
}

/**
 * Prefer the protected route the user tried to open before login.
 */
export function resolveLoginRedirectPath(location, fallback = '/') {
  const fromPath = buildPathFromLocationState(location?.state?.from);
  if (!fromPath || fromPath === '/login' || fromPath.startsWith('/register')) {
    return fallback;
  }
  return fromPath;
}
