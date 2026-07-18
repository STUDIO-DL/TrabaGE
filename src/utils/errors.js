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

function isOAuthCancelled(message) {
  return message.includes('access_denied') || message.includes('user cancelled');
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
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('email rate limit') ||
    message.includes('over_email_send_rate_limit')
  ) {
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
  if (message.includes('smtp') || message.includes('error sending confirmation email')) {
    return getErrorMessage('smtpError');
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
