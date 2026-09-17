import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

const PUSH_FUNCTION = 'send_push';
const PUSH_BATCH_SIZE = 2000;

async function sendPushBatch(recipientIds, title, body, data = {}) {
  if (!recipientIds?.length) return;

  for (let i = 0; i < recipientIds.length; i += PUSH_BATCH_SIZE) {
    const batch = recipientIds.slice(i, i + PUSH_BATCH_SIZE);
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const { data: responseData, error } = await supabase.functions.invoke(PUSH_FUNCTION, {
          body: {
            recipient_ids: batch,
            title,
            body,
            data,
          },
        });

        if (!error && !responseData?.error) {
          lastError = null;
          break;
        }
        lastError = error ?? new Error(responseData?.error ?? 'Push send failed');
      } catch (error) {
        lastError = error;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (2 ** attempt)));
      }
    }
    if (lastError) {
      reportError(lastError, { area: 'push_notification_batch', recipients: batch.length });
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

    await sendPushBatch(
      [recipientId],
      title,
      (body != null && String(body).trim()) || title,
      pushPayload,
    );

    return { data, error: null };
  },

  /**
   * Notify all followers of a company/institution (in-app + FCM-ready push).
   */
  notifyFollowers: async ({
    targetType,
    targetId,
    title,
    message,
    link,
    type = 'company_update',
    postId,
    jobId,
    actorId,
    actorType,
  }) => {
    const metadata = {
      link,
      target_type: targetType,
      target_id: targetId,
      ...(postId ? { post_id: postId } : {}),
      ...(jobId ? { job_id: jobId } : {}),
      ...(actorId ? { actor_id: actorId } : {}),
      ...(actorType ? { actor_type: actorType } : targetType ? { actor_type: targetType } : {}),
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
   * The sender cannot read the recipient's notification row (RLS), so the payload
   * is built from the message itself. send_push verifies the trigger row as admin.
   */
  dispatchNewMessagePush: async ({
    messageId,
    recipientId,
    conversationId,
    senderId,
    title,
    body,
    link,
  }) => {
    if (!messageId || !recipientId || !conversationId) return;

    const pushTitle = String(title ?? '').trim() || 'Nuevo mensaje';
    const pushBody = String(body ?? '').trim() || 'Tienes un mensaje nuevo en TrabaGE.';
    const pushLink = String(link ?? '').trim() || `/personal/messages/${conversationId}`;

    await sendPushBatch(
      [recipientId],
      pushTitle,
      pushBody,
      {
        type: 'new_message',
        link: pushLink,
        conversation_id: conversationId,
        message_id: messageId,
        ...(senderId ? { sender_id: senderId } : {}),
      },
    );
  },

  /**
   * In-app + Web Push for people who follow the author or would find the post relevant.
   */
  notifyPostRecommendation: async (postId, { actorId, preview } = {}) => {
    if (!postId) return { data: null, error: new Error('Publicación requerida') };

    const { data: recipientIds, error } = await supabase.rpc('notify_post_recommendations', {
      p_post_id: postId,
    });

    if (error) {
      reportError(error, { area: 'post_recommendation_notify', postId });
      return { data: null, error };
    }

    const ids = recipientIds ?? [];
    if (ids.length > 0) {
      const title = 'Este post podría interesarte';
      const body = String(preview ?? '').trim() || 'Hay una publicación nueva en TrabaGE.';
      await sendPushBatch(ids, title, body, {
        type: 'post_recommendation',
        post_id: postId,
        link: `/post/${postId}`,
        target_type: 'post',
        target_id: postId,
        ...(actorId ? { actor_id: actorId } : {}),
      });
    }

    return { data: { notified: ids.length }, error: null };
  },
};
