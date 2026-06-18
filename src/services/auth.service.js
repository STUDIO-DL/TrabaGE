import { isSupabaseConfigured, supabase } from '../config/supabase';

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

  loginWithGoogle: async (role = 'candidate') => {
    if (!isSupabaseConfigured) {
      return configError();
    }

    const appUrl = import.meta.env.VITE_APP_URL?.trim() || window.location.origin;

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback`,
        data: { role },
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
  },

  loginWithApple: () =>
    supabase.auth.signInWithOAuth({ provider: 'apple' }),

  logout: () => supabase.auth.signOut(),

  deleteAccount: () => supabase.rpc('delete_own_account'),

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${import.meta.env.VITE_APP_URL}/login`,
    }),

  getSession: () => supabase.auth.getSession(),

  getUserRole: (userId) =>
    supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
};
