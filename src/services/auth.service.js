import { isSupabaseConfigured, supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';

const PENDING_ACCOUNT_TYPE_KEY = 'pending_account_type';
const LEGACY_PENDING_ACCOUNT_TYPE_KEY = 'trabage_pending_account_type';
const VALID_ACCOUNT_TYPES = [ROLES.CANDIDATE, ROLES.COMPANY];
const VALID_STORED_ROLES = [ROLES.CANDIDATE, ROLES.COMPANY, ROLES.ADMIN];
const NEW_OAUTH_USER_WINDOW_MS = 10 * 60 * 1000;

function normalizeAccountType(accountType) {
  if (accountType === 'organization') return ROLES.COMPANY;
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

function savePendingAccountType(role) {
  const normalizedRole = normalizeAccountType(role);

  if (normalizedRole) {
    localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, toPendingAccountType(normalizedRole));
    localStorage.removeItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);
  } else {
    localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
    localStorage.removeItem(LEGACY_PENDING_ACCOUNT_TYPE_KEY);
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
  login: async (email, password) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    return supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password: normalizePassword(password),
    });
  },

  register: async (email, password, role) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    return supabase.auth.signUp({
      email: normalizeEmail(email),
      password: normalizePassword(password),
      options: {
        data: { role },
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

  signupWithGoogle: async (role = ROLES.CANDIDATE) => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const normalizedRole = normalizeAccountType(role) ?? ROLES.CANDIDATE;
    savePendingAccountType(normalizedRole);

    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
        data: { role: normalizedRole },
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
