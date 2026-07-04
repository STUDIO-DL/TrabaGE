import { createClient } from '@supabase/supabase-js';
import { readViteEnv } from './env';

export const supabaseUrl = readViteEnv(import.meta.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = readViteEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder'),
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('[TrabaGE] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);
