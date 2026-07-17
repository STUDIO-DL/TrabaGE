export const GUEST_MODE_MESSAGE = 'Inicia sesión para realizar esta acción.';

export function notifyGuestBlocked(showToast, message = GUEST_MODE_MESSAGE) {
  showToast(message, 'info');
}
