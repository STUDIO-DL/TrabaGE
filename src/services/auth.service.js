import { isSupabaseConfigured, supabase } from '../config/supabase';
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
  return getErrorMessage('googleLoginNoAccount');
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
  return Boolean(
    meta.role ||
      meta.account_kind ||
      meta.account_type ||
      meta.full_name ||
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

  return Math.abs(lastSignInAt - createdAt) < FIRST_SIGNIN_WINDOW_MS;
}

/**
 * A TrabaGE account exists when the user already has a profile, is admin,
 * has signup metadata, confirmed email from a non-Google-only identity, or is
 * a returning auth user with a role. Pure Google OAuth always sets
 * email_confirmed_at — that alone is NOT a TrabaGE account (LOGIN without signup).
 */
export async function isRegisteredTrabaGEAccount(user) {
  if (!user?.id) return false;

  const profileRole = await getExistingProfileRole(user.id);
  if (profileRole) return true;

  // Prior signup form metadata ⇒ real account, even inside the first-minute window.
  if (hasSignupMetadata(user)) return true;

  // Email confirmation from password/email signup (or linked non-Google identity).
  // Google-only OAuth confirms email automatically — ignore that alone.
  if (user.email_confirmed_at && !isGoogleOnlyIdentity(user)) return true;

  const identities = user.identities || [];
  if (identities.length > 1) return true;

  const { data: roleRow, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  // A read failure must not discard a real OAuth session as "unregistered".
  if (error) return true;

  const role = normalizeStoredRole(roleRow?.role);
  if (role === ROLES.ADMIN) return true;
  if (!role) return false;

  // Accidental Google LOGIN creates a user + default role via trigger. Only
  // reject when it is clearly a fresh Google-only identity.
  if (isBrandNewAuthUser(user) && isGoogleOnlyIdentity(user)) return false;

  return true;
}

/**
 * Removes the orphan auth session created by Google OAuth when the user tried
 * to sign in without an existing TrabaGE account. Never leaves them logged in.
 * Hard-delete only for brand-new Google-only orphans — Google always has
 * email_confirmed_at, so that flag alone must not block cleanup.
 */
export async function discardUnregisteredOAuthSession(user = null) {
  const canHardDelete =
    user &&
    !hasSignupMetadata(user) &&
    isGoogleOnlyIdentity(user) &&
    isBrandNewAuthUser(user);

  if (canHardDelete) {
    try {
      await supabase.rpc('delete_own_account');
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

    const profileRole = await getExistingProfileRole(userId);
    const storedRole = normalizeStoredRole(existingRole?.role);

    if (storedRole === ROLES.ADMIN) {
      return { data: existingRole, error: null };
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

  deleteAccount: () => supabase.rpc('delete_own_account'),

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: getOAuthCallbackRedirectUrl(),
    }),

  setPassword: (password) =>
    supabase.auth.updateUser({ password: normalizePassword(password) }),

  changePasswordWithCurrent: async (email, currentPassword, newPassword) => {
    const loginResult = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password: normalizePassword(currentPassword),
    });

    if (loginResult.error) return loginResult;

    return supabase.auth.updateUser({ password: normalizePassword(newPassword) });
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
