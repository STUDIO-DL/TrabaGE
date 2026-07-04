export const STRONG_PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.';

export function validateStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    return { valid: false, error: STRONG_PASSWORD_MESSAGE };
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
    return { valid: false, error: STRONG_PASSWORD_MESSAGE };
  }

  return { valid: true, error: null };
}
