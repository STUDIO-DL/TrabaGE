/** Aligns with Supabase auth.email.max_frequency (60s). */
export const SIGNUP_EMAIL_COOLDOWN_MS = 60 * 1000;

const COOLDOWN_PREFIX = 'trabage_email_confirmation_cooldown:';
const PENDING_SIGNUP_PREFIX = 'trabage_pending_signup:';
const INFLIGHT_PREFIX = 'trabage_signup_inflight:';

export function normalizeSignupEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cooldownKey(email) {
  return `${COOLDOWN_PREFIX}${encodeURIComponent(normalizeSignupEmail(email))}`;
}

function pendingKey(email) {
  return `${PENDING_SIGNUP_PREFIX}${normalizeSignupEmail(email)}`;
}

function inflightKey(email) {
  return `${INFLIGHT_PREFIX}${normalizeSignupEmail(email)}`;
}

export function readSignupCooldownDeadline(email) {
  return Number(sessionStorage.getItem(cooldownKey(email)) || localStorage.getItem(cooldownKey(email)) || 0);
}

export function getSignupCooldownRemainingSeconds(email) {
  const remainingMs = readSignupCooldownDeadline(email) - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function isSignupEmailCooldownActive(email) {
  return readSignupCooldownDeadline(email) > Date.now();
}

export function markSignupEmailSent(email, sentAt = Date.now()) {
  const deadline = String(sentAt + SIGNUP_EMAIL_COOLDOWN_MS);
  localStorage.setItem(cooldownKey(email), deadline);
  sessionStorage.setItem(cooldownKey(email), deadline);
}

export function isPendingSignupEmail(email) {
  return Boolean(normalizeSignupEmail(email)) && localStorage.getItem(pendingKey(email)) != null;
}

export function markPendingSignupEmail(email) {
  const normalized = normalizeSignupEmail(email);
  if (!normalized) return;
  localStorage.setItem(pendingKey(normalized), String(Date.now()));
}

export function clearPendingSignupEmail(email) {
  localStorage.removeItem(pendingKey(normalizeSignupEmail(email)));
}

export function isSignupInflight(email) {
  return sessionStorage.getItem(inflightKey(email)) === '1';
}

export function markSignupInflight(email) {
  sessionStorage.setItem(inflightKey(email), '1');
}

export function clearSignupInflight(email) {
  sessionStorage.removeItem(inflightKey(email));
}
