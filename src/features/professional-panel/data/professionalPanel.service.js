import { supabase } from '../../../config/supabase';
import { resolveProfessionalPanelPeriod } from '../domain/periods';

export const professionalPanelService = {
  getPanel: async ({ periodId = '30d' } = {}) => {
    const { from, to } = resolveProfessionalPanelPeriod(periodId);
    const { data, error } = await supabase.rpc('get_candidate_professional_panel', {
      p_from: from,
      p_to: to,
    });
    if (error) return { data: null, error };
    return { data, error: null };
  },

  trackEvent: async ({
    profileUserId,
    eventType,
    postId = null,
    metadata = {},
  }) => {
    if (!profileUserId || !eventType) return { error: null };
    const { error } = await supabase.rpc('track_candidate_analytics_event', {
      p_profile_user_id: profileUserId,
      p_event_type: eventType,
      p_post_id: postId,
      p_metadata: metadata,
    });
    return { error };
  },

  trackProfileView: async (profileUserId, metadata = {}) => {
    return professionalPanelService.trackEvent({
      profileUserId,
      eventType: 'profile_view',
      metadata,
    });
  },

  trackPostView: async (profileUserId, postId, metadata = {}) => {
    return professionalPanelService.trackEvent({
      profileUserId,
      eventType: 'post_view',
      postId,
      metadata,
    });
  },
};
