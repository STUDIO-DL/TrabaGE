import { supabase } from '../config/supabase';
import { normalizeTheme } from '../constants/theme';

export const appearanceService = {
  getOrCreate: async () => {
    const { data, error } = await supabase.rpc('ensure_appearance_preferences');
    return {
      data: data ? { ...data, theme: normalizeTheme(data.theme) } : null,
      error,
    };
  },

  updateTheme: async (userId, theme) => {
    if (!userId) {
      return { data: null, error: new Error('Usuario no autenticado') };
    }

    const { data, error } = await supabase
      .from('appearance_preferences')
      .upsert({ user_id: userId, theme: normalizeTheme(theme) }, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    return {
      data: data ? { ...data, theme: normalizeTheme(data.theme) } : null,
      error,
    };
  },
};
