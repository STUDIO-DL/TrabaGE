export function mapAuthError(error) {
  const message = error?.message?.toLowerCase() || '';

  if (message.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.';
  }
  if (message.includes('email not confirmed')) {
    return 'Debes verificar tu correo electrónico para poder iniciar sesión.';
  }
  if (message.includes('user already registered')) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (message.includes('password should be at least 6 characters')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (message.includes('unable to validate email address')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (message.includes('failed to fetch') || message.includes('network error')) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.';
  }

  return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.';
}