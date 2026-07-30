import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';
import { getProfileCompletionScore } from '../utils/profileCompletionScore';

/**
 * Authoritative completion from SQL (migration 120). Falls back to local scorer.
 */
export async function fetchProfileCompletion(userId = null) {
  try {
    const { data, error } = userId
      ? await supabase.rpc('get_profile_completion', { p_user_id: userId })
      : await supabase.rpc('get_profile_completion');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    reportError(error, { area: 'profile_completion_rpc' });
    return { data: null, error };
  }
}

export { getProfileCompletionScore };
