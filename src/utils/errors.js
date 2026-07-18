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

function isOAuthCancelled(message) {
  return message.includes('access_denied') || message.includes('user cancelled');
}

function isAuthHookError(message, code) {
  return (
    code === 'unexpected_failure' ||
    message.includes('error sending confirmation email') ||
    message.includes('error running hook') ||
    message.includes('hook requires authorization token') ||
    message.includes('invalid payload sent to hook') ||
    message.includes('unexpected status code returned from hook') ||
    message.includes('service currently unavailable due to hook') ||
    message.includes('secreto del hook') ||
    message.includes('send_email_hook_secret') ||
    message.includes('resend_api_key')
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

  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return getErrorMessage('invalidCredentials');
  }
  if (isEmailNotConfirmedError(message, code)) {
    return getErrorMessage('emailNotConfirmed');
  }
  if (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
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
