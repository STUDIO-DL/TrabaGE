import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

const PUSH_FUNCTION = 'send_push';
const PUSH_BATCH_SIZE = 2000;

async function sendPushBatch(recipientIds, title, body, data = {}) {
  if (!recipientIds?.length) return;

  for (let i = 0; i < recipientIds.length; i += PUSH_BATCH_SIZE) {
    const batch = recipientIds.slice(i, i + PUSH_BATCH_SIZE);
    try {
      await supabase.functions.invoke(PUSH_FUNCTION, {
        body: {
          recipient_ids: batch,
          title,
          body,
          data,
        },
      });
    } catch (error) {
      reportError(error, { area: 'push_notification_batch', recipients: batch.length });
    }
  }
}

export const notificationsService = {
  getAll: (userId) =>
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false }),

  getUnreadCount: (userId) =>
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false),

  markAsRead: (id) =>
    supabase.from('notifications').update({ read: true }).eq('id', id),

  markAllAsRead: (userId) =>
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false),

  delete: (id) =>
    supabase.from('notifications').delete().eq('id', id),

  create: (data) =>
    supabase.rpc('create_notification', {
      p_recipient_id: data.recipient_id,
      p_type: data.type,
      p_title: data.title,
      p_body: data.body ?? null,
      p_metadata: data.metadata ?? null,
    }),

  sendPush: async ({ recipientIds, title, body, data = {} }) => {
    await sendPushBatch(recipientIds ?? [], title, body, data);
  },

  /**
   * Notify all followers of a company/institution (in-app + OneSignal-ready push).
   */
  notifyFollowers: async ({
    targetType,
    targetId,
    title,
    message,
    link,
    type = 'company_update',
  }) => {
    const metadata = {
      link,
      target_type: targetType,
      target_id: targetId,
    };

    const { data: recipientIds, error } = await supabase.rpc('notify_followers', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_type: type,
      p_title: title,
      p_body: message,
      p_metadata: metadata,
    });

    if (error) {
      return { data: null, error };
    }

    const ids = recipientIds ?? [];
    if (ids.length > 0) {
      await sendPushBatch(ids, title, message, { type, ...metadata });
    }

    return { data: { notified: ids.length }, error: null };
  },

  sendJobRecommendationPush: async ({ recipientIds, jobTitle, jobId }) => {
    if (!recipientIds?.length) return;

    const title = 'Nueva oferta para ti';
    const body = `La oferta "${jobTitle}" coincide con tu perfil.`;
    const data = {
      type: 'job_recommendation',
      link: `/candidate/jobs/${jobId}`,
      job_id: jobId,
    };

    await sendPushBatch(recipientIds, title, body, data);
  },
};
