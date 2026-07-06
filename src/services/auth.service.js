import { isSupabaseConfigured, supabase } from '../config/supabase';
import { accountKindToRole, isValidAccountKind } from '../constants/accountKinds';
import { ROLES } from '../constants/roles';

const PENDING_ACCOUNT_TYPE_KEY = 'pending_account_type';
const LEGACY_PENDING_ACCOUNT_TYPE_KEY = 'trabage_pending_account_type';
const PENDING_ORG_KIND_KEY = 'pending_org_kind';
const PENDING_ORG_DETAILS_KEY = 'pending_org_details';
const VALID_ACCOUNT_TYPES = [ROLES.CANDIDATE, ROLES.COMPANY];
const VALID_STORED_ROLES = [ROLES.CANDIDATE, ROLES.COMPANY, ROLES.ADMIN];
const NEW_OAUTH_USER_WINDOW_MS = 10 * 60 * 1000;

function normalizeAccountType(accountType) {
  if (accountType === 'organization') return ROLES.COMPANY;
  if (isValidAccountKind(accountType)) return accountKindToRole(accountType);
  return VALID_ACCOUNT_TYPES.includes(accountType) ? accountType : null;
}

function normalizeStoredRole(role) {
  if (role === 'organization') return ROLES.COMPANY;
  return VALID_STORED_ROLES.includes(role) ? role : null;
}

function toPendingAccountType(role) {
  return role === ROLES.COMPANY ? 'organization' : role;
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
  if (isValidAccountKind(accountKind)) {
    sessionStorage.setItem(PENDING_ORG_KIND_KEY, accountKind);
    return;
  }
  sessionStorage.removeItem(PENDING_ORG_KIND_KEY);
}

export function peekPendingOrgKind() {
  const kind = sessionStorage.getItem(PENDING_ORG_KIND_KEY);
  return isValidAccountKind(kind) ? kind : null;
}

export function consumePendingOrgKind() {
  const kind = peekPendingOrgKind();
  sessionStorage.removeItem(PENDING_ORG_KIND_KEY);
  return kind;
}

// Mirrors the pending_org_kind pattern: stores only the org-specific profile
// fields (company_name, sector, company_type) entered at sign-up so CompanySetup
// can pre-fill them. No candidate-only data is ever stored here.
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

async function getExistingProfileRole(userId) {
  const [candidateProfile, companyProfile] = await Promise.all([
    supabase.from('candidate_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('company_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);

  if (companyProfile.data?.user_id) return ROLES.COMPANY;
  if (candidateProfile.data?.user_id) return ROLES.CANDIDATE;
  return null;
}

function isRecentOAuthSignup(user) {
  if (!user?.created_at) return false;
  return Date.now() - new Date(user.created_at).getTime() < NEW_OAUTH_USER_WINDOW_MS;
}

export async function setUserRole(_userId, role) {
  const normalizedRole = normalizeAccountType(role);

  if (!normalizedRole) {
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

  login: async (email, password) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    return supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password: normalizePassword(password),
    });
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
    }

    // Persist org-only profile details (never candidate data) so CompanySetup
    // can pre-fill them after email verification.
    savePendingOrgDetails(metadata.orgDetails);

    return supabase.auth.signUp({
      email: normalizeEmail(email),
      password: normalizePassword(password),
      options: {
        data: signupData,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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

    const storedRole = normalizeStoredRole(existingRole?.role);
    const profileRole = await getExistingProfileRole(userId);

    if (storedRole === ROLES.ADMIN) {
      return { data: existingRole, error: null };
    }

    // OAuth signup: pending role from account-type selection overrides the
    // default "candidate" row inserted by handle_new_user for brand-new users.
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

    savePendingAccountType(null);

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
    }

    return result;
  },

  signupWithGoogle: async (accountKind = ROLES.CANDIDATE) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const normalizedRole = normalizeAccountType(accountKind) ?? ROLES.CANDIDATE;
    savePendingAccountType(accountKind);

    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
        data: {
          role: normalizedRole,
          account_kind: isValidAccountKind(accountKind) ? accountKind : undefined,
        },
      },
    });

    if (result.error) {
      consumePendingAccountType();
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
