import { supabase } from '../config/supabase';

/**
 * Follow targets: Business and Organizations only.
 * Personal accounts cannot be followed (product rule — do not enable follow-people).
 */
export const FOLLOWS_TARGET = {
  BUSINESS: 'business',
  ORGANIZATION: 'organization',
  // Legacy DB values — accepted by follow RPCs during migration transition
  COMPANY: 'business',
  INSTITUTION: 'organization',
};

export const followsService = {
  follow: async (userId, targetType, targetId) =>
    supabase
      .from('follows')
      .upsert(
        { user_id: userId, target_type: targetType, target_id: targetId },
        { onConflict: 'user_id,target_type,target_id' },
      )
      .select('id')
      .single(),

  unfollow: async (userId, targetType, targetId) =>
    supabase
      .from('follows')
      .delete()
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId),

  isFollowing: async (userId, targetType, targetId) =>
    supabase
      .from('follows')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle(),

  getFollowing: async (userId, targetType) =>
    supabase
      .from('follows')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', targetType),

  getFollowerCount: (targetType, targetId) =>
    supabase.rpc('get_follower_count', {
      p_target_type: targetType,
      p_target_id: targetId,
    }),

  getFollowers: (targetType, targetId, { limit = 20, offset = 0 } = {}) =>
    supabase.rpc('get_followers', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_limit: limit,
      p_offset: offset,
    }),
};
