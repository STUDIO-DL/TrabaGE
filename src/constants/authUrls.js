/** Canonical auth redirect paths — keep in sync with Supabase Dashboard redirect URLs. */
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_CONFIRM_PATH = '/auth/confirm';

export function getAuthRedirectUrl(path = AUTH_CONFIRM_PATH) {
  const configuredOrigin = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');
  if (configuredOrigin) {
    return `${configuredOrigin}${path}`;
  }
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/** Email signup / resend confirmation links land here (token_hash or PKCE code). */
export function getEmailConfirmRedirectUrl() {
  return getAuthRedirectUrl(AUTH_CONFIRM_PATH);
}

/** OAuth and password recovery callbacks. */
export function getOAuthCallbackRedirectUrl() {
  return getAuthRedirectUrl(AUTH_CALLBACK_PATH);
}

export function isAuthConfirmPath(pathname = '') {
  return String(pathname).startsWith(AUTH_CONFIRM_PATH);
}
