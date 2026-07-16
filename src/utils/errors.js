import { STRONG_PASSWORD_MESSAGE } from './passwordValidation';

export function mapAuthError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase?.() || '';

  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.';
  }
  if (message.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Tu correo electrónico aún no ha sido verificado. Revisa tu bandeja de entrada y activa tu cuenta antes de iniciar sesión.';
  }
  if (
    message.includes('token has expired') ||
    message.includes('token is expired') ||
    message.includes('invalid token') ||
    message.includes('otp expired') ||
    code === 'otp_expired'
  ) {
    return 'El enlace de verificación es inválido o ha expirado. Solicita uno nuevo para continuar.';
  }
  if (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (message.includes('password should be at least') || message.includes('password')) {
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
  if (code === 'email_confirmation_disabled') {
    return 'No se pudo iniciar la verificación del correo. Contacta con soporte.';
  }
  if (code === 'email_confirmation_disabled') {
    return 'No se pudo iniciar la verificación del correo. Contacta con soporte.';
  }
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('email rate limit')) {
    return 'Has realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (message.includes('access_denied') || message.includes('oauth')) {
    return 'No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.';
  }
  if (message.includes('user banned') || message.includes('banned')) {
    return 'Esta cuenta no está disponible. Contacta con soporte si crees que es un error.';
  }
  if (message.includes('session missing') || message.includes('auth session missing')) {
    return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
  }
  if (message.includes('smtp') || message.includes('email')) {
    return 'No se pudo enviar el correo en este momento. Inténtalo de nuevo más tarde.';
  }

  return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.';
}
