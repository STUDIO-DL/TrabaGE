import { supabase } from '../config/supabase';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notificationPreferences';

export function normalizeNotificationPreferences(raw) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw ?? {}),
    account_security: true,
  };
}

export const notificationPreferencesService = {
  getOrCreate: async (userId) => {
    if (!userId) {
      return { data: null, error: new Error('Usuario no autenticado') };
    }

    const { error: upsertError } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (upsertError) {
      return { data: null, error: upsertError };
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      data: data ? normalizeNotificationPreferences(data) : null,
      error,
    };
  },

  update: async (userId, patch) => {
    if (!userId) {
      return { data: null, error: new Error('Usuario no autenticado') };
    }

    const payload = {
      user_id: userId,
      ...patch,
      account_security: true,
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    return {
      data: data ? normalizeNotificationPreferences(data) : null,
      error,
    };
  },
};
