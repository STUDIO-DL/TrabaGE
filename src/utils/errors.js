import { getErrorMessage, isErrorMessage } from './i18n';

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

function isUserAlreadyRegisteredError(message, code) {
  return (
    code === 'user_already_registered' ||
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  );
}

function isExpiredVerificationLink(message) {
  return (
    message.includes('otp_expired') ||
    message.includes('otp expired') ||
    message.includes('token has expired') ||
    message.includes('token is expired') ||
    message.includes('invalid token') ||
    message.includes('link is invalid') ||
    message.includes('invalid or has expired') ||
    message.includes('email link is invalid')
  );
}

function isAlreadyVerifiedConfirmationError(message, code) {
  return (
    code === 'email_already_confirmed' ||
    message.includes('already been verified') ||
    message.includes('email already confirmed') ||
    message.includes('already confirmed') ||
    message.includes('user already registered')
  );
}

export function isRecoverableConfirmationError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return isExpiredVerificationLink(message) || isAlreadyVerifiedConfirmationError(message, code);
}

function isOAuthCancelled(message) {
  return message.includes('access_denied') || message.includes('user cancelled');
}

function isAuthHookError(message, code) {
  return (
    code === 'unexpected_failure' ||
    code === 'hook_timeout_after_retry' ||
    message.includes('failed to reach hook') ||
    message.includes('hook_timeout') ||
    message.includes('error sending confirmation email') ||
    message.includes('error running hook') ||
    message.includes('hook requires authorization token') ||
    message.includes('invalid payload sent to hook') ||
    message.includes('unexpected status code returned from hook') ||
    message.includes('service currently unavailable due to hook') ||
    message.includes('secreto del hook') ||
    message.includes('send_email_hook_secret') ||
    message.includes('resend_api_key') ||
    message.includes('verificación por correo no configurada')
  );
}

function isRoleProvisioningError(message) {
  return (
    message.includes('authentication required') ||
    message.includes('invalid role') ||
    message.includes('account has multiple profile types') ||
    message.includes('role already bound') ||
    message.includes('role/profile mismatch') ||
    message.includes('role cannot be changed') ||
    message.includes('cannot provision profile')
  );
}

function isRateLimitError(message, code) {
  return (
    code === 'over_email_send_rate_limit' ||
    code === '429' ||
    message.includes('rate limit') ||
    message.includes('too many attempts') ||
    message.includes('too many requests') ||
    message.includes('email rate limit') ||
    message.includes('over_email_send_rate_limit')
  );
}

export function isAuthRateLimitError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return isRateLimitError(message, code);
}

export function mapAuthError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase?.() || '';
  const status = Number(error?.status || error?.statusCode || 0);

  if (status === 502 || status === 503 || status === 504) {
    return getErrorMessage('smtpError');
  }

  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return getErrorMessage('invalidCredentials');
  }
  if (isEmailNotConfirmedError(message, code)) {
    return getErrorMessage('emailNotConfirmed');
  }
  if (isUserAlreadyRegisteredError(message, code)) {
    return getErrorMessage('userAlreadyRegistered');
  }
  if (isPasswordValidationError(message, code)) {
    return getErrorMessage('strongPassword');
  }
  if (message.includes('unable to validate email address') || message.includes('invalid email')) {
    return getErrorMessage('invalidEmail');
  }
  if (message.includes('failed to fetch') || message.includes('network error')) {
    return getErrorMessage('networkError');
  }
  if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
    return getErrorMessage('signupDisabled');
  }
  if (code === 'email_confirmation_disabled') {
    return getErrorMessage('emailConfirmationDisabled');
  }
  if (code === 'confirmation_failed') {
    return getErrorMessage('expiredVerificationLink');
  }
  if (code === 'signup_failed') {
    return getErrorMessage('registerFailed');
  }
  if (isRateLimitError(message, code)) {
    return getErrorMessage('rateLimit');
  }
  if (isExpiredVerificationLink(message)) {
    return getErrorMessage('expiredVerificationLink');
  }
  if (isOAuthCancelled(message)) {
    return getErrorMessage('oauthCancelled');
  }
  if (message.includes('oauth') && !message.includes('provider')) {
    return getErrorMessage('oauthFailed');
  }
  if (message.includes('user banned') || message.includes('banned')) {
    return getErrorMessage('userBanned');
  }
  if (message.includes('session missing') || message.includes('auth session missing')) {
    return getErrorMessage('sessionExpired');
  }
  if (message.includes('smtp') || isAuthHookError(message, code)) {
    return getErrorMessage('smtpError');
  }
  if (message.includes('database error saving new user')) {
    return getErrorMessage('registerFailed');
  }
  if (isRoleProvisioningError(message)) {
    return getErrorMessage('registerFailed');
  }
  if (
    message.includes('no se pudo identificar el usuario') ||
    message.includes('no se pudo crear la cuenta') ||
    message.includes('no se pudo confirmar el correo') ||
    message.includes('tipo de cuenta inválido')
  ) {
    return getErrorMessage('registerFailed');
  }

  return getErrorMessage('unexpected');
}

export function isUnverifiedEmailError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase?.() || '';
  return isEmailNotConfirmedError(message, code);
}

export function isExpiredVerificationUserMessage(text) {
  return isErrorMessage('expiredVerificationLink', text);
}
