const MESSAGES = {
  es: {
    errors: {
      invalidCredentials: 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.',
      emailNotConfirmed:
        'Tu correo electrónico aún no ha sido verificado. Revisa tu bandeja de entrada y activa tu cuenta antes de iniciar sesión.',
      userAlreadyRegistered: 'Ya existe una cuenta registrada con este correo electrónico.',
      strongPassword:
        'La contraseña debe tener al menos 6 caracteres e incluir mayúscula, minúscula y símbolo.',
      invalidEmail: 'El formato del correo electrónico no es válido.',
      networkError:
        'No se pudo conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.',
      signupDisabled: 'El registro de nuevas cuentas no está disponible en este momento.',
      emailConfirmationDisabled:
        'No se pudo iniciar la verificación del correo. Contacta con soporte.',
      rateLimit: 'Has realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      expiredVerificationLink:
        'El enlace de verificación ha expirado o ya no es válido. Solicita uno nuevo.',
      oauthCancelled: 'Inicio de sesión con Google cancelado. Inténtalo de nuevo cuando quieras.',
      oauthFailed: 'No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.',
      userBanned: 'Esta cuenta no está disponible. Contacta con soporte si crees que es un error.',
      sessionExpired: 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
      smtpError: 'No se pudo enviar el correo en este momento. Inténtalo de nuevo más tarde.',
      unexpected: 'No hemos podido completar la operación. Inténtalo de nuevo.',
      googleLoginNoAccount:
        'No encontramos una cuenta asociada a este correo.\n\nSi todavía no tienes una cuenta en TrabaGE, puedes crear una utilizando "Crear cuenta".',
      authIncomplete: 'No se pudo completar la autenticación. Inténtalo de nuevo.',
      passwordSaveFailed: 'No se pudo guardar la contraseña.',
      registerFailed: 'No se pudo completar el registro. Inténtalo de nuevo.',
      selectAccountType: 'Selecciona un tipo de cuenta.',
      enterEmail: 'Introduce tu correo electrónico.',
      passwordsMismatch: 'Las contraseñas no coinciden.',
      selectCity: 'Selecciona tu ciudad.',
      acceptTerms: 'Debes aceptar los Términos y Condiciones y la Política de Uso de Datos.',
      enterCurrentPassword: 'Introduce tu contraseña actual.',
      passwordMustDiffer: 'La nueva contraseña debe ser diferente de la contraseña actual.',
      cannotVerifyEmail: 'No se pudo verificar el correo de tu cuenta. Vuelve a iniciar sesión.',
      registerFullNameRequired: 'Introduce tu nombre completo.',
      registerBusinessNameRequired: 'Introduce el nombre de tu cuenta Business.',
      registerOrgNameRequired: 'Introduce el nombre de la organización.',
      registerOrgTypeRequired: 'Selecciona el tipo de organización.',
      supabaseFallback: 'No hemos podido completar la operación. Inténtalo de nuevo.',
    },
    auth: {
      passwordHint: 'Mínimo 6 caracteres con mayúscula, minúscula y símbolo.',
    },
  },
  en: {
    errors: {
      invalidCredentials: 'Incorrect email or password. Please try again.',
      emailNotConfirmed:
        'Your email has not been verified yet. Check your inbox and activate your account before signing in.',
      userAlreadyRegistered: 'An account with this email address already exists.',
      strongPassword:
        'Password must be at least 6 characters and include an uppercase letter, a lowercase letter, and a symbol.',
      invalidEmail: 'The email address format is not valid.',
      networkError:
        'Could not connect to the server. Check your internet connection and try again.',
      signupDisabled: 'New account registration is not available at this time.',
      emailConfirmationDisabled: 'Could not start email verification. Contact support.',
      rateLimit: 'Too many attempts. Wait a few minutes and try again.',
      expiredVerificationLink: 'The verification link has expired or is no longer valid. Request a new one.',
      oauthCancelled: 'Google sign-in was cancelled. Try again whenever you are ready.',
      oauthFailed: 'Could not complete Google sign-in. Please try again.',
      userBanned: 'This account is not available. Contact support if you believe this is a mistake.',
      sessionExpired: 'Your session has expired. Please sign in again.',
      smtpError: 'Could not send the email at this time. Please try again later.',
      unexpected: 'An unexpected error occurred. Please try again later.',
      googleLoginNoAccount:
        'We could not find an account linked to this email.\n\nIf you do not have a TrabaGE account yet, you can create one using "Create account".',
      authIncomplete: 'Could not complete authentication. Please try again.',
      passwordSaveFailed: 'Could not save the password.',
      registerFailed: 'Could not complete registration. Please try again.',
      selectAccountType: 'Select an account type.',
      enterEmail: 'Enter your email address.',
      passwordsMismatch: 'Passwords do not match.',
      selectCity: 'Select your city.',
      acceptTerms: 'You must accept the Terms and Conditions and the Data Use Policy.',
      enterCurrentPassword: 'Enter your current password.',
      passwordMustDiffer: 'The new password must be different from your current password.',
      cannotVerifyEmail: 'Could not verify your account email. Please sign in again.',
      registerFullNameRequired: 'Enter your full name.',
      registerBusinessNameRequired: 'Enter the business name.',
      registerOrgNameRequired: 'Enter the organization name.',
      registerOrgTypeRequired: 'Select the organization type.',
      supabaseFallback: 'Could not complete the action. Please try again.',
    },
    auth: {
      passwordHint: 'Minimum 6 characters with uppercase, lowercase, and a symbol.',
    },
  },
};

let cachedLocale = null;

export function getLocale() {
  if (cachedLocale) return cachedLocale;

  if (typeof navigator !== 'undefined') {
    const deviceLanguage = navigator.language || navigator.languages?.[0] || 'es';
    cachedLocale = deviceLanguage.toLowerCase().startsWith('en') ? 'en' : 'es';
  } else {
    cachedLocale = 'es';
  }

  return cachedLocale;
}

function resolveMessage(locale, key) {
  const parts = key.split('.');
  let value = MESSAGES[locale];

  for (const part of parts) {
    value = value?.[part];
  }

  return value;
}

export function t(key, localeOverride) {
  const locale = localeOverride || getLocale();
  const localized = resolveMessage(locale, key);

  if (localized != null) return localized;

  const fallback = resolveMessage('es', key);
  return fallback ?? key;
}

export function getErrorMessage(key) {
  return t(`errors.${key}`);
}

export function isErrorMessage(key, text) {
  return text === t(`errors.${key}`, 'es') || text === t(`errors.${key}`, 'en');
}
