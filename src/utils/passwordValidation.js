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
  const hasDigit = /\d/.test(password);

  // Google Password Manager and similar tools often generate strong alphanumeric
  // passwords without symbols. Match Supabase "lower_upper_letters_digits".
  if (!hasLowercase || !hasUppercase || !hasDigit) {
    return { valid: false, error: errorMessage };
  }

  return { valid: true, error: null };
}
