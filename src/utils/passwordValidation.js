import { getErrorMessage } from './i18n';

export function getStrongPasswordMessage() {
  return getErrorMessage('strongPassword');
}

export function validateStrongPassword(password) {
  const errorMessage = getStrongPasswordMessage();
  const value = typeof password === 'string' ? password.trim() : password;

  if (typeof value !== 'string' || value.length < 6) {
    return { valid: false, error: errorMessage };
  }

  const hasLowercase = /[a-z]/.test(value);
  const hasUppercase = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);

  // Google Password Manager and similar tools often generate strong alphanumeric
  // passwords without symbols. Match Supabase "lower_upper_letters_digits".
  if (!hasLowercase || !hasUppercase || !hasDigit) {
    return { valid: false, error: errorMessage };
  }

  return { valid: true, error: null };
}
