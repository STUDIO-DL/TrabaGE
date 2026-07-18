import { isSupabaseConfigured, supabase } from '../config/supabase';
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
import { isAuthRateLimitError } from '../utils/errors';

const PENDING_ACCOUNT_TYPE_KEY = 'pending_account_type';
const LEGACY_PENDING_ACCOUNT_TYPE_KEY = 'trabage_pending_account_type';
const PENDING_ORG_KIND_KEY = 'pending_org_kind';
const PENDING_ORG_DETAILS_KEY = 'pending_org_details';
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

function pendingVerificationResult(existingUnconfirmed = true, rateLimited = false) {
  return {
    data: { session: null, user: null },
    error: null,
    pendingVerification: true,
    existingUnconfirmed,
    rateLimited,
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
      meta.full_name ||
      meta.company_name ||
      meta.city,
  );
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
 * has confirmed email (email signup), has signup metadata, or is a returning
 * auth user with a role. Only a brand-new Google-only OAuth row (LOGIN without
 * prior signup) is treated as unregistered — never delete confirmed users.
 */
export async function isRegisteredTrabaGEAccount(user) {
  if (!user?.id) return false;

  const profileRole = await getExistingProfileRole(user.id);
  if (profileRole) return true;

  // Email confirmation or prior signup metadata ⇒ real account, even inside
  // the first-minute window (welcome email → Google login race).
  if (user.email_confirmed_at || hasSignupMetadata(user)) return true;

  const identities = user.identities || [];
  if (identities.length > 1) return true;

  const { data: roleRow, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return false;

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
 * Hard-delete only for brand-new Google-only orphans — never confirmed emails.
 */
export async function discardUnregisteredOAuthSession(user = null) {
  const canHardDelete =
    user &&
    !user.email_confirmed_at &&
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
  },

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
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
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

    const signupData = {
      role,
      full_name: metadata.fullName?.trim() || undefined,
      city: metadata.city?.trim() || undefined,
      account_kind: metadata.accountKind || undefined,
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

    // Persist org-only profile details (never personal data) so CompanySetup
    // can pre-fill them after email verification.
    savePendingOrgDetails(metadata.orgDetails);

    let result;
    try {
      result = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizePassword(password),
        options: {
          data: signupData,
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
    } finally {
      clearSignupInflight(normalizedEmail);
    }

    if (result.error) {
      return result;
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

    if (result.error) {
      if (isAuthRateLimitError(result.error)) {
        markSignupEmailSent(normalizedEmail);
        // Only treat as pending verification when Supabase already created the user.
        if (result.data?.user?.id) {
          markPendingSignupEmail(normalizedEmail);
          return pendingVerificationResult(true, true);
        }
        return result;
      }
      return result;
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
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
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

    if (errorDescription) {
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
    const confirmationType = query.get('type') === 'signup' ? 'signup' : 'email';
    let result;

    if (tokenHash) {
      result = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: confirmationType,
      });
    } else if (code) {
      result = await supabase.auth.exchangeCodeForSession(code);
    } else {
      return {
        data: { user: null, session: null },
        error: {
          code: 'confirmation_failed',
          message: 'El enlace de verificación no es válido o ha expirado.',
        },
      };
    }

    if (result.error) return result;

    const user = result.data?.user ?? result.data?.session?.user;
    const session = result.data?.session ?? null;
    if (!isEmailVerified(user)) {
      return {
        data: result.data,
        error: {
          code: 'email_not_confirmed',
          message: 'No se pudo confirmar el correo electrónico.',
        },
      };
    }

    return { data: { user, session }, error: null };
  },

  applyPendingAccountType: async (userOrId) => {
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    if (!userId) {
      return { data: null, error: { message: 'No se pudo identificar el usuario autenticado' } };
    }

    const pendingRole = consumePendingAccountType();
    const currentUser = typeof userOrId === 'string' ? null : userOrId;

    const { data: existingRole, error: roleError } = await authService.getUserRole(userId);
    if (roleError) {
      return { data: null, error: roleError };
    }

    const profileRole = await getExistingProfileRole(userId);
    const storedRole = normalizeStoredRole(
      existingRole?.role,
      // company_type only needed for legacy `company` rows pre-migration
    );

    if (storedRole === ROLES.ADMIN) {
      return { data: existingRole, error: null };
    }

    // OAuth signup: pending role from account-type selection overrides the
    // default "personal" row inserted by handle_new_user for brand-new users.
    if (
      pendingRole &&
      currentUser &&
      isRecentOAuthSignup(currentUser) &&
      storedRole &&
      storedRole !== pendingRole
    ) {
      return setUserRole(userId, pendingRole);
    }

    if (storedRole) {
      return { data: { ...existingRole, role: storedRole }, error: null };
    }

    if (profileRole) {
      return setUserRole(userId, profileRole);
    }

    if (!pendingRole) {
      return {
        data: { role: null, needsAccountTypeSelection: true },
        error: null,
      };
    }

    return setUserRole(userId, pendingRole);
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
        redirectTo: `${window.location.origin}/auth/callback`,
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

    savePendingAccountType(accountKind);
    saveOAuthIntent(OAUTH_INTENTS.SIGNUP);

    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
      redirectTo: `${window.location.origin}/auth/callback`,
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
