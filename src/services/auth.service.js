import { supabase } from '../config/supabase';

export const authService = {
  login: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

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

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/login`,
    }),

  getSession: () => supabase.auth.getSession(),

  getUserRole: (userId) =>
    supabase.from('user_roles').select('role').eq('user_id', userId).single(),
};
