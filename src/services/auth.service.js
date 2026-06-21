import { isSupabaseConfigured, supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';

const PENDING_ACCOUNT_TYPE_KEY = 'pending_account_type';
const LEGACY_PENDING_ACCOUNT_TYPE_KEY = 'trabage_pending_account_type';
const VALID_ACCOUNT_TYPES = [ROLES.CANDIDATE, ROLES.COMPANY];
const NEW_OAUTH_USER_WINDOW_MS = 10 * 60 * 1000;

function normalizeAccountType(accountType) {
  if (accountType === 'organization') return ROLES.COMPANY;
  return VALID_ACCOUNT_TYPES.includes(accountType) ? accountType : null;
}

function toPendingAccountType(role) {
  return role === ROLES.COMPANY ? 'organization' : role;
}

function isLikelyNewOAuthUser(user) {
  const createdAt = Date.parse(user?.created_at ?? '');

  if (!Number.isFinite(createdAt)) {
    return false;
  }

  return Date.now() - createdAt <= NEW_OAUTH_USER_WINDOW_MS;
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

  register: (email, password, role) =>
    supabase.auth.signUp({
      email: normalizeEmail(email),
      password: normalizePassword(password),
      options: { data: { role } },
    }),

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

    const storedRole = normalizeAccountType(existingRole?.role);
    const profileRole = await getExistingProfileRole(userId);
    const isNewOAuthUser = isLikelyNewOAuthUser(currentUser);

    if (storedRole === ROLES.ADMIN) {
      return { data: existingRole, error: null };
    }

    if (profileRole) {
      if (storedRole) {
        return { data: { ...existingRole, role: storedRole }, error: null };
      }

      return supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: profileRole }, { onConflict: 'user_id' })
        .select('role, created_at')
        .maybeSingle();
    }

    if (!pendingRole) {
      if (storedRole && !isNewOAuthUser) {
        return { data: { ...existingRole, role: storedRole }, error: null };
      }

      return {
        data: { role: null, needsAccountTypeSelection: true },
        error: null,
      };
    }

    if (storedRole && !isNewOAuthUser) {
      return { data: { ...existingRole, role: storedRole }, error: null };
    }

    return supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: pendingRole }, { onConflict: 'user_id' })
      .select('role, created_at')
      .maybeSingle();
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

    savePendingAccountType(role);

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

  loginWithApple: () =>
    supabase.auth.signInWithOAuth({ provider: 'apple' }),

  logout: () => supabase.auth.signOut(),

  deleteAccount: () => supabase.rpc('delete_own_account'),

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/login`,
    }),

  setPassword: (password) =>
    supabase.auth.updateUser({ password: normalizePassword(password) }),

  getSession: () => supabase.auth.getSession(),

  getUserRole: (userId) =>
    supabase.from('user_roles').select('role, created_at').eq('user_id', userId).maybeSingle(),
};
