import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '../config/supabase';
import {
  getEmailConfirmRedirectUrl,
  getOAuthCallbackRedirectUrl,
} from '../constants/authUrls';
import {
  accountKindToRole,
  isValidAccountKind,
  normalizeAccountKind,
} from '../constants/accountKinds';
import {
  ASSIGNABLE_ROLES,
  isEmployerRole,
  isOrganizationCompanyType,
  isPersonalRole,
  normalizeRole,
  ROLES,
} from '../constants/roles';
import { getErrorMessage } from '../utils/i18n';
import {
  GOOGLE_NO_ACCOUNT_MESSAGE,
  GOOGLE_NO_ACCOUNT_TITLE,
} from '../constants/googleAuth';
import { reportError } from '../utils/logger';
import { clearOneSignalUserId, isOneSignalConfigured } from '../config/onesignal';
import {
  clearSignupInflight,
  isPendingSignupEmail,
  isSignupEmailCooldownActive,
  isSignupInflight,
  markPendingSignupEmail,
  markSignupEmailSent,
  markSignupInflight,
  normalizeSignupEmail,
} from '../utils/signupEmailCooldown';
import { isAuthRateLimitError, isRecoverableConfirmationError } from '../utils/errors';

const PENDING_ACCOUNT_TYPE_KEY = 'pending_account_type';
const LEGACY_PENDING_ACCOUNT_TYPE_KEY = 'trabage_pending_account_type';
const PENDING_ORG_KIND_KEY = 'pending_org_kind';
const PENDING_ORG_DETAILS_KEY = 'pending_org_details';
const PENDING_SIGNUP_DETAILS_KEY = 'pending_signup_details';
const OAUTH_INTENT_KEY = 'trabage_oauth_intent';
const VALID_ACCOUNT_TYPES = ASSIGNABLE_ROLES;
const VALID_STORED_ROLES = [...ASSIGNABLE_ROLES, ROLES.ADMIN];
const NEW_OAUTH_USER_WINDOW_MS = 24 * 60 * 60 * 1000;
/** First Google sign-in: created_at and last_sign_in_at are nearly identical. */
const FIRST_SIGNIN_WINDOW_MS = 60 * 1000;

function isExistingUnconfirmedUser(user) {
  if (!user?.id) return false;
  const identities = user.identities;
  return Array.isArray(identities) && identities.length === 0;
}

const SESSION_DETECT_WAIT_MS = 250;
const AUTH_STORAGE_KEY = 'trabage-auth';
const VERIFIED_ACCOUNT_EMAIL_KEY = 'trabage_verified_account_email';

async function waitForInitialSessionDetection(ms = SESSION_DETECT_WAIT_MS) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function readPersistedAuthSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.access_token && parsed?.refresh_token && parsed?.user) {
      return parsed;
    }

    const nested = parsed?.currentSession ?? parsed?.session;
    if (nested?.access_token && nested?.refresh_token && nested?.user) {
      return nested;
    }
  } catch {
    // Ignore malformed storage payloads.
  }

  return null;
}

function rememberVerifiedAccountEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof window === 'undefined') return;

  try {
    localStorage.setItem(VERIFIED_ACCOUNT_EMAIL_KEY, normalized);
  } catch {
    // Private mode / quota exceeded — best effort only.
  }
}

async function restoreVerifiedSessionFromStorage() {
  const persisted = readPersistedAuthSession();
  if (!persisted?.user || !isEmailVerified(persisted.user)) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: persisted.access_token,
    refresh_token: persisted.refresh_token,
  });

  if (error || !data?.session?.user || !isEmailVerified(data.session.user)) {
    return null;
  }

  rememberVerifiedAccountEmail(data.session.user.email);
  return { user: data.session.user, session: data.session };
}

async function getVerifiedSessionFromClient() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { session: null, user: null, error };
  }

  const session = data?.session ?? null;
  const user = session?.user ?? null;
  if (user && isEmailVerified(user)) {
    rememberVerifiedAccountEmail(user.email);
    return { session, user, error: null };
  }

  return { session: null, user: null, error: null };
}

async function resolveVerifiedUserFromServer() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user || !isEmailVerified(data.user)) {
    return null;
  }

  const verified = await getVerifiedSessionFromClient();
  if (verified.user && verified.session) {
    return { user: verified.user, session: verified.session };
  }

  const restored = await restoreVerifiedSessionFromStorage();
  if (restored?.user && restored.session) {
    return restored;
  }

  return null;
}

async function recoverVerifiedSessionAfterOtpFailure() {
  let verified = await getVerifiedSessionFromClient();
  if (verified.user && verified.session) {
    return { user: verified.user, session: verified.session, alreadyVerified: true };
  }

  const restored = await restoreVerifiedSessionFromStorage();
  if (restored?.user && restored.session) {
    return { ...restored, alreadyVerified: true };
  }

  const recovered = await resolveVerifiedUserFromServer();
  if (recovered?.user && recovered.session) {
    return { ...recovered, alreadyVerified: true };
  }

  return null;
}

async function verifyEmailConfirmationToken(tokenHash, typeParam) {
  const primaryType = typeParam === 'signup' ? 'signup' : 'email';
  let result = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: primaryType,
  });

  if (!result.error || !isRecoverableConfirmationError(result.error)) {
    return result;
  }

  const alternateType = primaryType === 'email' ? 'signup' : 'email';
  const alternateResult = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: alternateType,
  });

  if (!alternateResult.error) {
    return alternateResult;
  }

  return result;
}

function pendingVerificationResult(existingUnconfirmed = true, rateLimited = false) {
  return {
    data: { session: null, user: null },
    error: null,
    pendingVerification: true,
    existingUnconfirmed,
    rateLimited,
  };
}

async function resolveSignUpErrorResult(result, normalizedEmail) {
  if (!result.error) return null;

  const userId = result.data?.user?.id;

  if (isAuthRateLimitError(result.error)) {
    markSignupEmailSent(normalizedEmail);
    markPendingSignupEmail(normalizedEmail);
    return pendingVerificationResult(true, true);
  }

  if (!userId) {
    return result;
  }

  markSignupEmailSent(normalizedEmail);
  markPendingSignupEmail(normalizedEmail);

  const resendResult = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
    },
  });

  if (!resendResult.error) {
    return {
      ...pendingVerificationResult(false),
      data: { ...result.data, session: null },
    };
  }

  if (isAuthRateLimitError(resendResult.error)) {
    return pendingVerificationResult(true, true);
  }

  return {
    data: { ...result.data, session: null },
    error: resendResult.error,
    pendingVerification: true,
    emailDeliveryFailed: true,
  };
}

export const OAUTH_INTENTS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
};

export function getGoogleLoginNoAccountMessage() {
  return GOOGLE_NO_ACCOUNT_MESSAGE;
}

export function getGoogleLoginNoAccountTitle() {
  return GOOGLE_NO_ACCOUNT_TITLE;
}

export function getEmailNotVerifiedMessage() {
  return getErrorMessage('emailNotConfirmed');
}

export function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at);
}

export function isEmailNotVerifiedError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'email_not_confirmed' || message.includes('email not confirmed');
}

function normalizeAccountType(accountType) {
  if (isValidAccountKind(accountType)) return accountKindToRole(accountType);
  return normalizeRole(accountType);
}

function normalizeStoredRole(role, companyType) {
  return normalizeRole(role, { companyType });
}

function toPendingAccountType(role) {
  return role;
}

function normalizeEmail(email) {
  return normalizeSignupEmail(email);
}

function normalizePassword(password) {
  return password.trim();
}

/**
 * Best-effort password-changed confirmation email.
 * Never throws to the caller; never blocks or reverts the password update.
 */
async function notifyPasswordChangedBestEffort() {
  try {
    const { data, error } = await supabase.functions.invoke('notify_password_changed', {
      body: {},
    });
    if (error || data?.ok === false) {
      reportError(error ?? new Error('password_changed_email_failed'), {
        area: 'password_changed_email',
        response: data ?? null,
      });
    }
  } catch (error) {
    reportError(error, { area: 'password_changed_email' });
  }
}

/**
 * Best-effort farewell email after successful account deletion.
 * Uses a one-time outbox token (no user JWT — auth user already deleted).
 * Calls the Edge Function with the anon key so a dead session JWT cannot interfere.
 */
async function notifyAccountGoodbyeBestEffort(goodbyeToken) {
  const token = String(goodbyeToken || '').trim();
  if (!token || !isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/functions/v1/send_account_goodbye_email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.ok === false) {
      reportError(new Error('account_goodbye_email_failed'), {
        area: 'account_goodbye_email',
        status: response.status,
        response: data ?? null,
      });
    }
  } catch (error) {
    reportError(error, { area: 'account_goodbye_email' });
  }
}

function configError() {
  return {
    data: { session: null, user: null },
    error: {
      message:
        'La aplicación no está conectada a Supabase. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    },
  };
}

function savePendingOrgKind(accountKind) {
  const normalized = normalizeAccountKind(accountKind);
  if (normalized) {
    sessionStorage.setItem(PENDING_ORG_KIND_KEY, normalized);
    return;
  }
  sessionStorage.removeItem(PENDING_ORG_KIND_KEY);
}

export function peekPendingOrgKind() {
  const kind = normalizeAccountKind(sessionStorage.getItem(PENDING_ORG_KIND_KEY));
  return kind;
}

export function consumePendingOrgKind() {
  const kind = peekPendingOrgKind();
  sessionStorage.removeItem(PENDING_ORG_KIND_KEY);
  return kind;
}

// Unified signup context persisted across OAuth redirect and email verification.
// Stores identity fields collected on the registration form before auth completes.
function savePendingSignupDetails(details) {
  if (details && typeof details === 'object') {
    const clean = {};
    if (details.full_name?.trim()) clean.full_name = details.full_name.trim();
    if (details.company_name?.trim()) clean.company_name = details.company_name.trim();
    if (details.sector?.trim()) clean.sector = details.sector.trim();
    if (details.company_type?.trim()) clean.company_type = details.company_type.trim();
    if (details.city?.trim()) clean.city = details.city.trim();
    if (details.avatar_path?.trim()) clean.avatar_path = details.avatar_path.trim();

    if (Object.keys(clean).length > 0) {
      sessionStorage.setItem(PENDING_SIGNUP_DETAILS_KEY, JSON.stringify(clean));
      savePendingOrgDetails(clean);
      return;
    }
  }
  sessionStorage.removeItem(PENDING_SIGNUP_DETAILS_KEY);
  sessionStorage.removeItem(PENDING_ORG_DETAILS_KEY);
}

export function peekPendingSignupDetails() {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_DETAILS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // Fall through to legacy org details storage.
  }
  return peekPendingOrgDetails();
}

export function consumePendingSignupDetails() {
  const details = peekPendingSignupDetails();
  sessionStorage.removeItem(PENDING_SIGNUP_DETAILS_KEY);
  consumePendingOrgDetails();
  return details;
}

// Mirrors the pending_org_kind pattern: stores only the org-specific profile
// fields (company_name, sector, company_type) entered at sign-up so CompanySetup
// can pre-fill them. No personal-only data is ever stored here.
function savePendingOrgDetails(details) {
  if (details && typeof details === 'object') {
    const clean = {};
    if (details.company_name) clean.company_name = details.company_name;
    if (details.sector) clean.sector = details.sector;
    if (details.company_type) clean.company_type = details.company_type;
    if (details.city) clean.city = details.city;

    if (Object.keys(clean).length > 0) {
      sessionStorage.setItem(PENDING_ORG_DETAILS_KEY, JSON.stringify(clean));
      return;
    }
  }
  sessionStorage.removeItem(PENDING_ORG_DETAILS_KEY);
}

export function peekPendingOrgDetails() {
  try {
    const raw = sessionStorage.getItem(PENDING_ORG_DETAILS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function consumePendingOrgDetails() {
  const details = peekPendingOrgDetails();
  sessionStorage.removeItem(PENDING_ORG_DETAILS_KEY);
  return details;
}

function savePendingAccountType(roleOrKind) {
  const normalizedRole = normalizeAccountType(roleOrKind);

  if (normalizedRole) {
    localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, toPendingAccountType(normalizedRole));
    localStorage.removeItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);
    if (isValidAccountKind(roleOrKind)) {
      savePendingOrgKind(roleOrKind);
    }
  } else {
    localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
    localStorage.removeItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);
    sessionStorage.removeItem(PENDING_ORG_KIND_KEY);
  }
}

function consumePendingAccountType() {
  const pendingRole =
    localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) ??
    localStorage.getItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);

  localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
  localStorage.removeItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);

  return normalizeAccountType(pendingRole);
}

function peekPendingAccountType() {
  const pendingRole =
    localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) ??
    localStorage.getItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);
  return normalizeAccountType(pendingRole);
}

function saveOAuthIntent(intent) {
  if (intent === OAUTH_INTENTS.LOGIN || intent === OAUTH_INTENTS.SIGNUP) {
    sessionStorage.setItem(OAUTH_INTENT_KEY, intent);
    try {
      localStorage.setItem(OAUTH_INTENT_KEY, intent);
    } catch {
      // Private mode / storage blocked — sessionStorage may still work.
    }
    return;
  }
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
  try {
    localStorage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    // Ignore.
  }
}

export function consumeOAuthIntent() {
  let intent = sessionStorage.getItem(OAUTH_INTENT_KEY);
  if (!intent) {
    try {
      intent = localStorage.getItem(OAUTH_INTENT_KEY);
    } catch {
      intent = null;
    }
  }
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
  try {
    localStorage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    // Ignore.
  }
  if (intent === OAUTH_INTENTS.LOGIN || intent === OAUTH_INTENTS.SIGNUP) return intent;
  // Pending account type implies signup even if intent was lost across redirect.
  if (peekPendingAccountType()) return OAUTH_INTENTS.SIGNUP;
  return null;
}

function isGoogleOnlyIdentity(user) {
  const identities = user?.identities;
  if (Array.isArray(identities) && identities.length > 0) {
    return identities.every((identity) => identity?.provider === 'google');
  }
  return user?.app_metadata?.provider === 'google';
}

function hasSignupMetadata(user) {
  const meta = user?.user_metadata || {};
  // Only treat registration-form fields as signup evidence.
  // Google OAuth often sets full_name / name / avatar_url — those must NOT
  // count as an existing TrabaGE account (would skip orphan cleanup on LOGIN).
  return Boolean(
    meta.role ||
      meta.account_kind ||
      meta.account_type ||
      meta.company_name ||
      meta.city,
  );
}

/** Role chosen on the registration form — stored in auth.users metadata at signUp(). */
export function resolveSignupRoleFromUser(user) {
  const meta = user?.user_metadata ?? {};
  const fromAccountKind = normalizeAccountKind(meta.account_kind || meta.account_type);
  if (fromAccountKind) return accountKindToRole(fromAccountKind);
  return normalizeAccountType(meta.role);
}

async function getExistingProfileRole(userId) {
  const [candidateProfile, companyProfile] = await Promise.all([
    supabase.from('candidate_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase
      .from('company_profiles')
      .select('user_id, company_type')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (candidateProfile.error) throw candidateProfile.error;
  if (companyProfile.error) throw companyProfile.error;

  if (companyProfile.data?.user_id) {
    return isOrganizationCompanyType(companyProfile.data.company_type)
      ? ROLES.ORGANIZATION
      : ROLES.BUSINESS;
  }
  if (candidateProfile.data?.user_id) return ROLES.PERSONAL;
  return null;
}

function isRecentOAuthSignup(user) {
  if (!user?.created_at) return false;
  return Date.now() - new Date(user.created_at).getTime() < NEW_OAUTH_USER_WINDOW_MS;
}

/**
 * True when this auth.users row was created by the current first sign-in
 * (typical for a brand-new Google OAuth user that Supabase just inserted).
 */
export function isBrandNewAuthUser(user) {
  if (!user?.created_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;

  const lastSignInAt = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).getTime()
    : Date.now();

  if (Number.isNaN(lastSignInAt)) return false;

  // created_at ≈ last_sign_in_at → first session for this auth user.
  return Math.abs(lastSignInAt - createdAt) < FIRST_SIGNIN_WINDOW_MS;
}

/** Sync gate for Google LOGIN orphans — no network. */
export function isLikelyUnregisteredGoogleLogin(user) {
  return (
    Boolean(user?.id) &&
    isBrandNewAuthUser(user) &&
    isGoogleOnlyIdentity(user) &&
    !hasSignupMetadata(user)
  );
}

/**
 * A TrabaGE account exists when the user already has a profile, is admin,
 * has signup metadata from email registration, or has a non-Google identity.
 * Pure Google OAuth (even with a default user_roles row) is NOT a TrabaGE account.
 *
 * @param {object} [options]
 * @param {boolean} [options.loginIntent] — fast-reject brand-new Google LOGIN orphans.
 */
export async function isRegisteredTrabaGEAccount(user, options = {}) {
  if (!user?.id) return false;

  const { loginIntent = false } = options;
  const googleOnly = isGoogleOnlyIdentity(user);
  const signupMeta = hasSignupMetadata(user);

  // Brand-new Google LOGIN orphans — no DB round-trip.
  if (loginIntent && googleOnly && !signupMeta && isBrandNewAuthUser(user)) {
    return false;
  }

  // Google-only without registration-form metadata cannot be "registered"
  // unless a real profile already exists (prior email signup / legacy Google signup).
  const [profileRole, roleResult] = await Promise.all([
    getExistingProfileRole(user.id),
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profileRole) return true;

  if (signupMeta) return true;

  if (user.email_confirmed_at && !googleOnly) return true;

  const identities = user.identities || [];
  if (identities.length > 1) return true;

  if (roleResult.error) throw roleResult.error;

  const role = normalizeStoredRole(roleResult.data?.role);
  if (role === ROLES.ADMIN) return true;

  // Default personal role from handle_new_user is NOT enough for Google-only users.
  if (googleOnly && !signupMeta) {
    return false;
  }

  return Boolean(role);
}

/**
 * Removes the orphan auth session created by Google OAuth when the user tried
 * to sign in without an existing TrabaGE account. Never leaves them logged in.
 * Hard-delete only for Google-only users without signup metadata (no farewell email).
 */
export async function discardUnregisteredOAuthSession(user = null) {
  const canHardDelete =
    user &&
    !hasSignupMetadata(user) &&
    isGoogleOnlyIdentity(user);

  if (canHardDelete) {
    try {
      // Orphan Google login cleanup — never send farewell email.
      await supabase.rpc('delete_own_account', { p_send_goodbye: false });
    } catch {
      // Fall through to signOut even if cleanup RPC fails.
    }
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors; navigation will still clear local UI state.
  }
  savePendingAccountType(null);
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
  try {
    localStorage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    // Ignore.
  }
}

export async function setUserRole(_userId, role) {
  const normalizedRole = normalizeAccountType(role);

  if (!normalizedRole || !VALID_ACCOUNT_TYPES.includes(normalizedRole)) {
    return { data: null, error: { message: 'Tipo de cuenta inválido' } };
  }

  return supabase.rpc('set_initial_user_role', { p_role: normalizedRole });
}

export const authService = {
  rememberAccountKind(accountKind) {
    if (isValidAccountKind(accountKind)) {
      savePendingOrgKind(accountKind);
    }
  },

  rememberOrgDetails(details) {
    savePendingOrgDetails(details);
    savePendingSignupDetails(details);
  },

  rememberSignupDetails(details) {
    savePendingSignupDetails(details);
  },

  peekPendingSignupDetails,

  consumePendingSignupDetails,

  consumePendingOrgKind,

  consumePendingOrgDetails,

  setUserRole,

  isRegisteredTrabaGEAccount,

  discardUnregisteredOAuthSession,

  consumeOAuthIntent,

  login: async (email, password) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const result = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password: normalizePassword(password),
    });

    if (isEmailNotVerifiedError(result.error)) {
      return {
        data: { user: null, session: null },
        error: { code: 'email_not_confirmed', message: getEmailNotVerifiedMessage() },
      };
    }

    if (result.data?.user && !isEmailVerified(result.data.user)) {
      await supabase.auth.signOut({ scope: 'local' });
      return {
        data: { user: null, session: null },
        error: { code: 'email_not_confirmed', message: getEmailNotVerifiedMessage() },
      };
    }

    return result;
  },

  resendVerificationEmail: (email) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    return supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
      options: {
        emailRedirectTo: getEmailConfirmRedirectUrl(),
      },
    });
  },

  rememberPendingAccountType(accountKind) {
    savePendingAccountType(accountKind);
  },

  register: async (email, password, role, metadata = {}) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const normalizedEmail = normalizeEmail(email);

    if (isSignupInflight(normalizedEmail)) {
      return pendingVerificationResult(false);
    }

    // Avoid repeat signUp() calls for the same pending email — each one triggers another auth email.
    if (isPendingSignupEmail(normalizedEmail) || isSignupEmailCooldownActive(normalizedEmail)) {
      return pendingVerificationResult(true);
    }

    markSignupInflight(normalizedEmail);

    const signupAccountKind = metadata.accountKind || role;
    const signupData = {
      role,
      account_type: signupAccountKind,
      full_name: metadata.fullName?.trim() || undefined,
      city: metadata.city?.trim() || undefined,
      account_kind: signupAccountKind,
      company_name: metadata.orgDetails?.company_name?.trim() || undefined,
      sector: metadata.orgDetails?.sector?.trim() || undefined,
      company_type: metadata.orgDetails?.company_type?.trim() || undefined,
    };

    if (metadata.accountKind) {
      savePendingOrgKind(metadata.accountKind);
      savePendingAccountType(metadata.accountKind);
    } else if (role) {
      savePendingAccountType(role);
    }

    // Persist signup identity for profile provisioning after email verification.
    savePendingSignupDetails({
      full_name: signupData.full_name,
      city: signupData.city,
      company_name: signupData.company_name,
      sector: signupData.sector,
      company_type: signupData.company_type,
    });
    savePendingOrgDetails(metadata.orgDetails);

    let result;
    try {
      result = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizePassword(password),
        options: {
          data: signupData,
          emailRedirectTo: getEmailConfirmRedirectUrl(),
        },
      });
    } finally {
      clearSignupInflight(normalizedEmail);
    }

    if (result.error) {
      return resolveSignUpErrorResult(result, normalizedEmail);
    }

    // Supabase anti-enumeration: existing emails often return user with empty
    // identities and no error. Treat that as already registered so we never
    // send the user to Verify Email with a password that was not stored.
    const identities = result.data?.user?.identities;
    if (result.data?.user && Array.isArray(identities) && identities.length === 0) {
      return {
        data: { user: null, session: null },
        error: {
          code: 'user_already_registered',
          message: 'User already registered',
        },
      };
    }

    if (result.data?.session) {
      await supabase.auth.signOut({ scope: 'local' });
      return {
        data: { ...result.data, session: null },
        error: {
          code: 'email_confirmation_disabled',
          message:
            'La confirmación de correo no está habilitada en Supabase. Activa Confirm Email antes de registrar usuarios.',
        },
      };
    }

    if (!result.data?.user?.id) {
      return {
        data: { session: null, user: null },
        error: {
          code: 'signup_failed',
          message: 'No se pudo crear la cuenta. Inténtalo de nuevo.',
        },
      };
    }

    if (result.data?.user) {
      markSignupEmailSent(normalizedEmail);
      markPendingSignupEmail(normalizedEmail);

      if (isExistingUnconfirmedUser(result.data.user)) {
        return {
          ...pendingVerificationResult(true),
          data: { ...result.data, session: null },
        };
      }
    }

    return result;
  },

  resendSignupConfirmation: async (email) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const normalizedEmail = normalizeEmail(email);

    if (isSignupEmailCooldownActive(normalizedEmail)) {
      return {
        data: null,
        error: {
          code: 'over_email_send_rate_limit',
          message: getErrorMessage('rateLimit'),
        },
      };
    }

    const result = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: getEmailConfirmRedirectUrl(),
      },
    });

    if (result.error && isAuthRateLimitError(result.error)) {
      markSignupEmailSent(normalizedEmail);
    } else if (!result.error) {
      markSignupEmailSent(normalizedEmail);
    }

    return result;
  },

  confirmEmailFromUrl: async () => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const errorDescription =
      query.get('error_description') || hash.get('error_description');

    const successPayload = (user, session, { alreadyVerified = false } = {}) => {
      if (user?.email) {
        rememberVerifiedAccountEmail(user.email);
      }

      return {
        data: { user, session },
        error: null,
        alreadyVerified,
      };
    };

    const persistedSessionSnapshot = readPersistedAuthSession();

    // Allow detectSessionInUrl / PKCE code exchange to finish first.
    await waitForInitialSessionDetection();

    let verified = await getVerifiedSessionFromClient();
    if (verified.user && verified.session) {
      return successPayload(verified.user, verified.session, { alreadyVerified: true });
    }

    if (
      persistedSessionSnapshot?.user &&
      isEmailVerified(persistedSessionSnapshot.user)
    ) {
      const restored = await restoreVerifiedSessionFromStorage();
      if (restored?.user && restored.session) {
        return successPayload(restored.user, restored.session, { alreadyVerified: true });
      }
    }

    if (errorDescription) {
      const recovered = await resolveVerifiedUserFromServer();
      if (recovered?.user && recovered.session) {
        return successPayload(recovered.user, recovered.session, { alreadyVerified: true });
      }

      return {
        data: { user: null, session: null },
        error: {
          code: query.get('error') || hash.get('error') || 'confirmation_failed',
          message: decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
        },
      };
    }

    const tokenHash = query.get('token_hash') || hash.get('token_hash');
    const code = query.get('code');
    const typeParam = query.get('type') || hash.get('type');

    if (!tokenHash && !code) {
      verified = await getVerifiedSessionFromClient();
      if (verified.user && verified.session) {
        return successPayload(verified.user, verified.session, { alreadyVerified: true });
      }

      const recovered = await resolveVerifiedUserFromServer();
      if (recovered?.user && recovered.session) {
        return successPayload(recovered.user, recovered.session, { alreadyVerified: true });
      }

      return {
        data: { user: null, session: null },
        error: {
          code: 'confirmation_failed',
          message: 'El enlace de verificación no es válido o ha expirado.',
        },
      };
    }

    let result;
    if (tokenHash) {
      result = await verifyEmailConfirmationToken(tokenHash, typeParam);
    } else {
      result = await supabase.auth.exchangeCodeForSession(code);
    }

    if (result.error) {
      await waitForInitialSessionDetection(150);

      const recovered = await recoverVerifiedSessionAfterOtpFailure();
      if (recovered?.user && recovered.session) {
        return successPayload(recovered.user, recovered.session, { alreadyVerified: true });
      }

      return result;
    }

    let user = result.data?.user ?? result.data?.session?.user ?? null;
    let session = result.data?.session ?? null;

    if (!isEmailVerified(user)) {
      await waitForInitialSessionDetection(150);
      verified = await getVerifiedSessionFromClient();
      if (verified.user && verified.session) {
        return successPayload(verified.user, verified.session);
      }

      return {
        data: result.data,
        error: {
          code: 'email_not_confirmed',
          message: 'No se pudo confirmar el correo electrónico.',
        },
      };
    }

    if (!session) {
      verified = await getVerifiedSessionFromClient();
      session = verified.session;
      user = verified.user ?? user;
    }

    return successPayload(user, session);
  },

  applyPendingAccountType: async (userOrId) => {
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    if (!userId) {
      return { data: null, error: { message: 'No se pudo identificar el usuario autenticado' } };
    }

    const currentUser = typeof userOrId === 'string' ? null : userOrId;
    const signupRole = currentUser ? resolveSignupRoleFromUser(currentUser) : null;
    const pendingRole = consumePendingAccountType();
    const authoritativeRole = signupRole || pendingRole;

    const { data: existingRole, error: roleError } = await authService.getUserRole(userId);
    if (roleError) {
      return { data: null, error: roleError };
    }

    const storedRole = normalizeStoredRole(existingRole?.role);

    // Admins never go through account-type selection or set_initial_user_role.
    if (storedRole === ROLES.ADMIN || authoritativeRole === ROLES.ADMIN) {
      if (storedRole === ROLES.ADMIN) {
        return { data: { ...existingRole, role: ROLES.ADMIN }, error: null };
      }
      return {
        data: null,
        error: {
          message:
            'Esta cuenta de administrador no tiene el rol asignado en la base de datos. Contacta con soporte.',
        },
      };
    }

    // Returning login: role already stored and no pending type change — skip profile probes.
    if (storedRole && !authoritativeRole) {
      return { data: { ...existingRole, role: storedRole }, error: null };
    }

    if (storedRole && authoritativeRole && storedRole === authoritativeRole) {
      return { data: { ...existingRole, role: storedRole }, error: null };
    }

    let profileRole = null;
    try {
      profileRole = await getExistingProfileRole(userId);
    } catch (profileError) {
      // Profile lookup must not force "create account" when a role already exists.
      if (storedRole) {
        return { data: { ...existingRole, role: storedRole }, error: null };
      }
      return { data: null, error: profileError };
    }

    // Registration form metadata wins over a stale/default DB role (e.g. personal).
    if (storedRole && authoritativeRole && storedRole !== authoritativeRole) {
      return setUserRole(userId, authoritativeRole);
    }

    if (storedRole) {
      return { data: { ...existingRole, role: storedRole }, error: null };
    }

    if (authoritativeRole) {
      return setUserRole(userId, authoritativeRole);
    }

    if (profileRole) {
      return setUserRole(userId, profileRole);
    }

    return {
      data: { role: null, needsAccountTypeSelection: true },
      error: null,
    };
  },

  loginWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    // Login must never carry a pending account type — that would create/upgrade
    // an account. Intent is stored so the callback can reject brand-new users.
    savePendingAccountType(null);
    saveOAuthIntent(OAUTH_INTENTS.LOGIN);

    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthCallbackRedirectUrl(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (result.error) {
      sessionStorage.removeItem(OAUTH_INTENT_KEY);
    }

    return result;
  },

  signupWithGoogle: async (accountKind = ROLES.PERSONAL) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const normalizedRole = normalizeAccountType(accountKind);
    if (normalizedRole !== ROLES.PERSONAL) {
      return {
        data: null,
        error: {
          message: 'El registro con Google solo está disponible para cuentas personales.',
        },
      };
    }

    savePendingAccountType(ROLES.PERSONAL);
    saveOAuthIntent(OAUTH_INTENTS.SIGNUP);

    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthCallbackRedirectUrl(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (result.error) {
      consumePendingAccountType();
      sessionStorage.removeItem(OAUTH_INTENT_KEY);
      try {
        localStorage.removeItem(OAUTH_INTENT_KEY);
      } catch {
        // Ignore.
      }
    }

    return result;
  },

  loginWithApple: () => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    return supabase.auth.signInWithOAuth({ provider: 'apple' });
  },

  logout: () => supabase.auth.signOut(),

  /**
   * Permanently deletes the authenticated account.
   * Optional exit-survey payload is snapshotted server-side before auth.users delete.
   * @param {{ reasonCode?: string, reasonOther?: string, rating?: number|null, improvementComment?: string }} [feedback]
   */
  deleteAccount: async (feedback = {}) => {
    if (isOneSignalConfigured()) {
      try {
        await clearOneSignalUserId();
      } catch {
        // Continue — account deletion must not fail on push cleanup.
      }
    }

    const reasonCode = String(feedback?.reasonCode ?? '').trim() || null;
    const reasonOther = String(feedback?.reasonOther ?? '').trim() || null;
    const improvementComment = String(feedback?.improvementComment ?? '').trim() || null;
    const ratingRaw = feedback?.rating;
    const rating =
      ratingRaw == null || ratingRaw === ''
        ? null
        : Number.isFinite(Number(ratingRaw))
          ? Math.min(10, Math.max(1, Math.round(Number(ratingRaw))))
          : null;

    const result = await supabase.rpc('delete_own_account', {
      p_send_goodbye: true,
      p_reason_code: reasonCode,
      p_reason_other: reasonOther,
      p_rating: rating,
      p_improvement_comment: improvementComment,
    });
    if (!result.error) {
      const payload =
        typeof result.data === 'string'
          ? (() => {
              try {
                return JSON.parse(result.data);
              } catch {
                return null;
              }
            })()
          : result.data;
      const goodbyeToken = payload?.goodbye_token;
      if (goodbyeToken) {
        // Best-effort backup; server pg_net may already be sending. Never block UI.
        void notifyAccountGoodbyeBestEffort(goodbyeToken);
      }
    }
    return result;
  },

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: getOAuthCallbackRedirectUrl(),
    }),

  setPassword: async (password) => {
    const result = await supabase.auth.updateUser({ password: String(password ?? '') });
    if (!result.error) {
      void notifyPasswordChangedBestEffort();
    }
    return result;
  },

  /**
   * Authenticated password change with verification of the current password.
   * Uses Auth `current_password` (supported by supabase-js ≥2.102) so we do not
   * rely on a full sign-in round-trip that can race with session listeners.
   */
  changePasswordWithCurrent: async (_email, currentPassword, newPassword) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const current = String(currentPassword ?? '');
    const next = String(newPassword ?? '');

    if (!current) {
      return { data: null, error: { message: 'Enter your current password.', code: 'validation_failed' } };
    }

    const result = await supabase.auth.updateUser({
      password: next,
      current_password: current,
    });

    if (!result.error) {
      void notifyPasswordChangedBestEffort();
      return result;
    }

    // Fallback for projects/API versions that still reject current_password:
    // re-authenticate then update.
    const code = String(result.error?.code || '').toLowerCase();
    const message = String(result.error?.message || '').toLowerCase();
    const currentPasswordUnsupported =
      code === 'validation_failed' &&
      (message.includes('current_password') || message.includes('unexpected'));

    if (!currentPasswordUnsupported) {
      return result;
    }

    const email = String(_email || '').trim().toLowerCase();
    if (!email) {
      return result;
    }

    const loginResult = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (loginResult.error) return loginResult;

    const retry = await supabase.auth.updateUser({ password: next });
    if (!retry.error) {
      void notifyPasswordChangedBestEffort();
    }
    return retry;
  },

  getSession: () => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    return supabase.auth.getSession();
  },

  getUserRole: (userId) =>
    supabase.from('user_roles').select('role, created_at').eq('user_id', userId).maybeSingle(),
};

export { isEmployerRole, isPersonalRole, normalizeStoredRole };
