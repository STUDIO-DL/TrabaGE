import { clearPreviewMode } from '../constants/preview';

export const GUEST_MODE_MESSAGE = 'Inicia sesión para realizar esta acción.';

/** Prefer signup so guests exploring as company can create an account. */
export const GUEST_AUTH_PATH = '/register';

export function notifyGuestBlocked(showToast, message = GUEST_MODE_MESSAGE) {
  showToast(message, 'info');
}

/** Leave guest preview and open auth (register by default). */
export function exitGuestToAuth(navigate, { path = GUEST_AUTH_PATH, replace = true } = {}) {
  clearPreviewMode();
  if (typeof navigate === 'function') {
    navigate(path, { replace });
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.assign(path);
  }
}
