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
   * Creates an in-app notification and sends push when the recipient allows both.
   * Push is skipped when in-app delivery is blocked by preferences.
   */
  notifyUser: async ({
    recipientId,
    type,
    title,
    body = null,
    metadata = {},
    pushData = null,
  }) => {
    if (!recipientId) {
      return { data: null, error: new Error('Destinatario requerido') };
    }

    const { data, error } = await notificationsService.create({
      recipient_id: recipientId,
      type,
      title,
      body,
      metadata,
    });

    if (error) {
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: null, skipped: true };
    }

    const pushPayload = pushData ?? {
      type,
      ...metadata,
    };

    await sendPushBatch([recipientId], title, body ?? '', pushPayload);

    return { data, error: null };
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

  /**
   * Sends OS push for a new internal message.
   * In-app row is created by notify_new_message trigger; this only dispatches push.
   */
  dispatchNewMessagePush: async ({ messageId, recipientId }) => {
    if (!messageId || !recipientId) return;

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('title, body, metadata')
      .eq('recipient_id', recipientId)
      .eq('type', 'new_message')
      .eq('metadata->>message_id', String(messageId))
      .maybeSingle();

    if (error) {
      reportError(error, { area: 'message_push_lookup', messageId, recipientId });
      return;
    }

    if (!notification) return;

    const metadata = notification.metadata ?? {};
    const pushData = {
      type: 'new_message',
      link: metadata.link ?? '',
      conversation_id: metadata.conversation_id ?? '',
      message_id: metadata.message_id ?? messageId,
    };

    await sendPushBatch(
      [recipientId],
      notification.title,
      notification.body ?? '',
      pushData,
    );
  },
};
