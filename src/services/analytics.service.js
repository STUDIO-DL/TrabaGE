import { supabase } from '../config/supabase';

export const analyticsService = {
  trackEvent: (userId, jobId, eventType, metadata = {}) =>
    supabase.rpc('track_recommendation_event', {
      p_user_id: userId,
      p_job_id: jobId ?? null,
      p_event_type: eventType,
      p_metadata: metadata,
    }),

  trackNotificationOpened: (userId, jobId, metadata = {}) =>
    analyticsService.trackEvent(userId, jobId, 'notification_opened', metadata),

  trackJobViewed: (userId, jobId, metadata = {}) =>
    analyticsService.trackEvent(userId, jobId, 'job_viewed', metadata),

  trackApplicationSubmitted: (userId, jobId, metadata = {}) =>
    analyticsService.trackEvent(userId, jobId, 'application_submitted', metadata),
};
