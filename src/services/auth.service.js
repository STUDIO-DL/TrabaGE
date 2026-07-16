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

const PENDING_ACCOUNT_TYPE_KEY = 'pending_account_type';
const LEGACY_PENDING_ACCOUNT_TYPE_KEY = 'trabage_pending_account_type';
const PENDING_ORG_KIND_KEY = 'pending_org_kind';
const PENDING_ORG_DETAILS_KEY = 'pending_org_details';
const OAUTH_INTENT_KEY = 'trabage_oauth_intent';
const VALID_ACCOUNT_TYPES = ASSIGNABLE_ROLES;
const VALID_STORED_ROLES = [...ASSIGNABLE_ROLES, ROLES.ADMIN];
const NEW_OAUTH_USER_WINDOW_MS = 10 * 60 * 1000;
/** First Google sign-in: created_at and last_sign_in_at are nearly identical. */
const FIRST_SIGNIN_WINDOW_MS = 60 * 1000;

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
  return email.trim().toLowerCase();
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
    return;
  }
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
}

export function consumeOAuthIntent() {
  const intent = sessionStorage.getItem(OAUTH_INTENT_KEY);
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
  if (intent === OAUTH_INTENTS.LOGIN || intent === OAUTH_INTENTS.SIGNUP) return intent;
  // Pending account type implies signup even if intent was lost across redirect.
  if (peekPendingAccountType()) return OAUTH_INTENTS.SIGNUP;
  return null;
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
 * or is a returning auth user with a role (e.g. email signup before bootstrap).
 * A brand-new OAuth user with only the DB trigger's default role is NOT registered.
 */
export async function isRegisteredTrabaGEAccount(user) {
  if (!user?.id) return false;

  const profileRole = await getExistingProfileRole(user.id);
  if (profileRole) return true;

  const { data: roleRow, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return false;

  const role = normalizeStoredRole(roleRow?.role);
  if (role === ROLES.ADMIN) return true;

  if (isBrandNewAuthUser(user)) return false;

  return Boolean(role);
}

/**
 * Removes the orphan auth session created by Google OAuth when the user tried
 * to sign in without an existing TrabaGE account. Never leaves them logged in.
 */
export async function discardUnregisteredOAuthSession() {
  try {
    await supabase.rpc('delete_own_account');
  } catch {
    // Fall through to signOut even if cleanup RPC fails.
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors; navigation will still clear local UI state.
  }
  savePendingAccountType(null);
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
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

    const signupData = {
      role,
      full_name: metadata.fullName?.trim() || undefined,
      city: metadata.city?.trim() || undefined,
      account_kind: metadata.accountKind || undefined,
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

    const result = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password: normalizePassword(password),
      options: {
        data: signupData,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

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

    return result;
  },

  resendSignupConfirmation: (email) => {
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
      const sessionResult = await supabase.auth.getSession();
      result = {
        data: {
          session: sessionResult.data?.session ?? null,
          user: sessionResult.data?.session?.user ?? null,
        },
        error: sessionResult.error,
      };
    }

    if (result.error) return result;

    const user = result.data?.user ?? result.data?.session?.user;
    if (!isEmailVerified(user)) {
      return {
        data: result.data,
        error: {
          code: 'email_not_confirmed',
          message: 'No se pudo confirmar el correo electrónico.',
        },
      };
    }

    // Confirmation is complete, but TrabaGE requires an explicit login after it.
    await supabase.auth.signOut({ scope: 'local' });
    return { data: { user, session: null }, error: null };
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

    const normalizedRole = normalizeAccountType(accountKind) ?? ROLES.PERSONAL;
    savePendingAccountType(accountKind);
    saveOAuthIntent(OAUTH_INTENTS.SIGNUP);

    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
        data: {
          role: normalizedRole,
          account_kind: normalizeAccountKind(accountKind) || undefined,
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
