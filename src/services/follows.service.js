import { supabase } from '../config/supabase';

export const FOLLOWS_TARGET = {
  COMPANY: 'company',
  INSTITUTION: 'institution',
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
