import { supabase } from '../../config/supabase';

export const companyAnalyticsService = {
  /**
   * Owner-only analytics bundle. RPC ignores any company_id — always auth.uid().
   */
  getBundle: async ({ from = null, to = null, jobsLimit = 20, jobsOffset = 0 } = {}) => {
    const { data, error } = await supabase.rpc('get_company_analytics_bundle', {
      p_from: from,
      p_to: to,
      p_jobs_limit: jobsLimit,
      p_jobs_offset: jobsOffset,
    });

    if (error) return { data: null, error };
    return { data, error: null };
  },

  /**
   * Fire-and-forget event tracking. Failures are swallowed so UX never breaks.
   */
  trackEvent: async ({
    companyId,
    eventType,
    jobId = null,
    postId = null,
    metadata = {},
  }) => {
    if (!companyId || !eventType) return { error: null };
    try {
      const { error } = await supabase.rpc('track_company_analytics_event', {
        p_company_id: companyId,
        p_event_type: eventType,
        p_job_id: jobId,
        p_post_id: postId,
        p_metadata: metadata,
      });
      return { error: error || null };
    } catch (error) {
      return { error };
    }
  },

  trackProfileView: (companyId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'profile_view',
      metadata,
    }),

  trackJobView: (companyId, jobId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'job_view',
      jobId,
      metadata,
    }),

  trackWebsiteClick: (companyId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'website_click',
      metadata,
    }),

  trackWhatsappClick: (companyId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'whatsapp_click',
      metadata,
    }),

  trackEmailClick: (companyId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'email_click',
      metadata,
    }),

  trackPostShare: (companyId, postId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'post_share',
      postId,
      metadata,
    }),

  trackPostRepost: (companyId, postId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'post_repost',
      postId,
      metadata,
    }),

  trackPostView: (companyId, postId, metadata = {}) =>
    companyAnalyticsService.trackEvent({
      companyId,
      eventType: 'post_view',
      postId,
      metadata,
    }),

  /**
   * Owner-only repost performance metrics (count, reach, views via repost).
   */
  getRepostStats: async ({ from = null, to = null } = {}) => {
    const { data, error } = await supabase.rpc('get_company_repost_analytics', {
      p_from: from,
      p_to: to,
    });
    if (error) return { data: null, error };
    return { data, error: null };
  },
};
