import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

const PUSH_FUNCTION = 'send_push';
const PUSH_BATCH_SIZE = 2000;

async function sendPushBatch(recipientIds, title, body, data = {}) {
  if (!recipientIds?.length) return;

  for (let i = 0; i < recipientIds.length; i += PUSH_BATCH_SIZE) {
    const batch = recipientIds.slice(i, i + PUSH_BATCH_SIZE);
    try {
      const { data: responseData, error } = await supabase.functions.invoke(PUSH_FUNCTION, {
        body: {
          recipient_ids: batch,
          title,
          body,
          data,
        },
      });

      if (error || responseData?.error) {
        reportError(error ?? new Error(responseData?.error ?? 'Push send failed'), {
          area: 'push_notification_batch',
          recipients: batch.length,
          response: responseData ?? null,
        });
      }
    } catch (error) {
      reportError(error, { area: 'push_notification_batch', recipients: batch.length });
    }
  }
}

export const NOTIFICATIONS_PAGE_SIZE = 15;

export const notificationsService = {
  getAll: (userId) =>
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false }),

  // Progressive/lazy loading via cursor (keyset) pagination. Returns a single
  // page of notifications ordered newest-first. Unlike offset/range paging,
  // this is resilient to rows being deleted between fetches: the window is
  // anchored to the (created_at, id) of the last loaded row, so deletions can
  // never shift the offset and cause items to be skipped or duplicated.
  //
  // `cursor` is `{ createdAt, id }` of the last row already loaded, or null for
  // the first page. `id` (UUID) is a stable tiebreaker for rows sharing the
  // exact same `created_at` timestamp.
  getPage: (userId, { cursor = null, limit = NOTIFICATIONS_PAGE_SIZE } = {}) => {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (cursor?.createdAt) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    return query;
  },

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
      link: `/personal/jobs/${jobId}`,
      job_id: jobId,
    };

    await sendPushBatch(recipientIds, title, body, data);
  },
};
