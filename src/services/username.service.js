import { supabase } from '../config/supabase';
import { mapUsernameRpcError, stripUsernameAt, validateUsername } from '../utils/username';

export const usernameService = {
  resolveUsername: async (username) => {
    const clean = stripUsernameAt(username);
    if (!clean) return { data: null, error: null };

    const { data, error } = await supabase.rpc('resolve_username', {
      p_username: clean,
    });

    if (error) return { data: null, error };
    const row = Array.isArray(data) ? data[0] : data;
    return { data: row ?? null, error: null };
  },

  getUsernameForUser: async (userId) => {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase.rpc('get_username_for_user', {
      p_user_id: userId,
    });
    return { data: data ?? null, error };
  },

  setMyUsername: async (username) => {
    const validation = validateUsername(username);
    if (!validation.valid) {
      return { data: null, error: { message: validation.error } };
    }

    const { data, error } = await supabase.rpc('set_my_username', {
      p_username: validation.value,
    });

    if (error) {
      return { data: null, error: { ...error, message: mapUsernameRpcError(error) } };
    }

    return { data: data ?? validation.value, error: null };
  },
};
