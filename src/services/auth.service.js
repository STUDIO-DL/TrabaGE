import { supabase } from '../config/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function loginWithPasswordDirect(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      data: { session: null, user: null },
      error: {
        message: body.error_description || body.msg || body.message || 'Invalid login credentials',
      },
    };
  }

  return supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
}

export const authService = {
  login: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    return loginWithPasswordDirect(normalizedEmail, password);
  },

  register: (email, password, role) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    }),

  loginWithGoogle: () =>
    supabase.auth.signInWithOAuth({ provider: 'google' }),

  loginWithApple: () =>
    supabase.auth.signInWithOAuth({ provider: 'apple' }),

  logout: () => supabase.auth.signOut(),

  deleteAccount: () => supabase.rpc('delete_own_account'),

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/login`,
    }),

  getSession: () => supabase.auth.getSession(),

  getUserRole: (userId) =>
    supabase.from('user_roles').select('role').eq('user_id', userId).single(),
};
