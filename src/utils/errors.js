import { STRONG_PASSWORD_MESSAGE } from './passwordValidation';

export const AUTH_ERROR_CODES = {
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
};

function isEmailNotConfirmedError(message, code) {
  return (
    message.includes('email not confirmed') ||
    message.includes('email_not_confirmed') ||
    code === 'email_not_confirmed'
  );
}

function isPasswordValidationError(message, code) {
  return (
    message.includes('password should be at least') ||
    message.includes('weak password') ||
    code === 'weak_password'
  );
}

function isExpiredVerificationLink(message) {
  return (
    message.includes('otp_expired') ||
    message.includes('token has expired') ||
    message.includes('link is invalid') ||
    message.includes('invalid or has expired') ||
    message.includes('email link is invalid')
  );
}

function isOAuthCancelled(message) {
  return message.includes('access_denied') || message.includes('user cancelled');
}

export function mapAuthError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase?.() || '';

  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.';
  }
  if (isEmailNotConfirmedError(message, code)) {
    return 'Debes verificar tu correo electrónico para poder iniciar sesión.';
  }
  if (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (isPasswordValidationError(message, code)) {
    return STRONG_PASSWORD_MESSAGE;
  }
  if (message.includes('unable to validate email address') || message.includes('invalid email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (message.includes('failed to fetch') || message.includes('network error')) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.';
  }
  if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
    return 'El registro de nuevas cuentas no está disponible en este momento.';
  }
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('email rate limit') ||
    message.includes('over_email_send_rate_limit')
  ) {
    return 'Has realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (isExpiredVerificationLink(message)) {
    return 'El enlace de verificación ha expirado o ya no es válido. Solicita uno nuevo.';
  }
  if (isOAuthCancelled(message)) {
    return 'Inicio de sesión con Google cancelado. Inténtalo de nuevo cuando quieras.';
  }
  if (message.includes('oauth') && !message.includes('provider')) {
    return 'No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.';
  }
  if (message.includes('user banned') || message.includes('banned')) {
    return 'Esta cuenta no está disponible. Contacta con soporte si crees que es un error.';
  }
  if (message.includes('session missing') || message.includes('auth session missing')) {
    return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
  }
  if (message.includes('smtp') || message.includes('error sending confirmation email')) {
    return 'No se pudo enviar el correo en este momento. Inténtalo de nuevo más tarde.';
  }

  return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.';
}

export function isUnverifiedEmailError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase?.() || '';
  return isEmailNotConfirmedError(message, code);
}
