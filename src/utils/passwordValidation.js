import { getErrorMessage } from './i18n';

export function getStrongPasswordMessage() {
  return getErrorMessage('strongPassword');
}

export function validateStrongPassword(password) {
  const errorMessage = getStrongPasswordMessage();

  if (typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: errorMessage };
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasLowercase || !hasUppercase || !hasSymbol) {
    return { valid: false, error: errorMessage };
  }

  return { valid: true, error: null };
}
