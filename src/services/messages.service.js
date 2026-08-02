import { supabase } from '../config/supabase';
import { executeWrite } from '../utils/supabaseMutation';
import { getDisplayName } from '../utils/displayIdentity';
import { ROLES, isEmployerRole } from '../constants/roles';
import { avatarTypeFromRole } from '../constants/avatarDefaults';
import { isOrganizationProfile } from '../utils/orgLabels';
import { notificationsService } from './notifications.service';
import { reportError } from '../utils/logger';

export const MESSAGES_PAGE_SIZE = 20;
export const MESSAGE_SEARCH_PAGE_SIZE = 15;
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_WAIT_FOR_REPLY =
  'Debes esperar a que esta persona responda antes de enviar otro mensaje.';

function mapMessageSendError(error) {
  if (!error) return error;

  const message = String(error.message ?? '');
  if (
    message.includes(MESSAGE_WAIT_FOR_REPLY) ||
    message.includes('respond') ||
    error.code === 'P0001'
  ) {
    return { ...error, message: MESSAGE_WAIT_FOR_REPLY };
  }

  return error;
}

async function dispatchMessagePushNotification(conversationId, senderId, message) {
  try {
    const { data: participants } = await messagesService.getConversationParticipants(conversationId);
    const recipient = (participants ?? []).find((participant) => participant.user_id !== senderId);
    if (!recipient?.user_id || !message?.id) return;

    await notificationsService.dispatchNewMessagePush({
      messageId: message.id,
      recipientId: recipient.user_id,
    });
  } catch (error) {
    reportError(error, { area: 'message_push_dispatch', conversationId, messageId: message?.id });
  }
}

function resolveParticipantRole(profile) {
  if (!profile) return ROLES.PERSONAL;
  if (profile.company_name != null || profile.logo_path != null) {
    return isOrganizationProfile(profile) ? ROLES.ORGANIZATION : ROLES.BUSINESS;
  }
  return ROLES.PERSONAL;
}

function buildParticipantSubtitle(profile, role) {
  if (!profile) return '';

  if (role === ROLES.PERSONAL) {
    return String(profile.headline ?? '').trim();
  }

  return String(profile.sector ?? profile.company_type ?? '').trim();
}

function mapParticipantSummary(profile, userId) {
  if (!profile) {
    return {
      userId,
      name: 'Usuario',
      avatarSrc: null,
      avatarType: 'personal',
      avatarVariant: 'circular',
      role: ROLES.PERSONAL,
      subtitle: '',
    };
  }

  const role = resolveParticipantRole(profile);
  const isEmployer = isEmployerRole(role);

  return {
    userId,
    name: getDisplayName(profile, role, { context: 'messages' }),
    // Raw storage path/URL only — AppAvatar resolves defaults (never pass bundled SVG URLs)
    avatarSrc: isEmployer ? profile?.logo_path ?? null : profile?.avatar_path ?? null,
    avatarType: avatarTypeFromRole(role, { companyType: profile?.company_type, profile }),
    avatarVariant: isEmployer ? 'rounded' : 'circular',
    role,
    subtitle: buildParticipantSubtitle(profile, role),
    profile,
  };
}

export const messagesService = {
  getOrCreateConversation: async (otherUserId) => {
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
      p_other_user_id: otherUserId,
    });
    return { data: data ?? null, error };
  },

  getConversations: async (userId) => {
    if (!userId) return { data: [], error: null };

    const { data: rows, error } = await supabase.rpc('list_user_conversations', {
      p_user_id: userId,
    });

    if (error) return { data: [], error };

    const otherUserIds = [...new Set((rows ?? []).map((row) => row.other_user_id))];
    const summariesResult = await messagesService.getParticipantSummaries(otherUserIds);
    const summaryMap = new Map(
      (summariesResult.data ?? []).map((item) => [item.userId, item]),
    );

    const conversations = (rows ?? []).map((row) => ({
      id: row.conversation_id,
      createdAt: row.created_at,
      otherParticipant: summaryMap.get(row.other_user_id) ?? mapParticipantSummary(null, row.other_user_id),
      otherLastReadAt: row.other_last_read_at,
      myLastReadAt: row.my_last_read_at,
      lastMessage: row.last_message_id
        ? {
            id: row.last_message_id,
            content: row.last_message_content,
            senderId: row.last_message_sender_id,
            createdAt: row.last_message_created_at,
          }
        : null,
      unreadCount: Number(row.unread_count ?? 0),
    }));

    return { data: conversations, error: null };
  },

  getMessages: async (conversationId, { cursor = null, limit = MESSAGES_PAGE_SIZE } = {}) => {
    const sanitize = (rows) =>
      (rows ?? []).map((row) => {
        if (row?.reply_to?.deleted_at) {
          return { ...row, reply_to: null };
        }
        return row;
      });

    const buildQuery = (withReply) => {
      let query = supabase
        .from('messages')
        .select(
          withReply
            ? `
              *,
              reply_to:reply_to_message_id (
                id,
                content,
                sender_id,
                created_at,
                deleted_at
              )
            `
            : '*',
        )
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);

      if (cursor?.createdAt) {
        query = query.or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        );
      }
      return query;
    };

    let { data, error } = await buildQuery(true);
    if (error && /reply_to_message_id|Could not find|deleted_at/i.test(String(error.message ?? ''))) {
      ({ data, error } = await buildQuery(false));
    }
    return { data: sanitize(data), error };
  },

  softDeleteOwnMessage: async (messageId) => {
    if (!messageId) {
      return { data: null, error: { message: 'Mensaje no válido.' } };
    }
    const { data, error } = await supabase.rpc('soft_delete_own_message', {
      p_message_id: messageId,
    });
    return { data: data ?? null, error };
  },

  sendMessage: async (conversationId, content, { replyToMessageId = null } = {}) => {
    const trimmed = String(content ?? '').trim();
    if (!trimmed) {
      return { data: null, error: { message: 'El mensaje no puede estar vacío.' } };
    }
    if (trimmed.length > MESSAGE_MAX_LENGTH) {
      return { data: null, error: { message: `Máximo ${MESSAGE_MAX_LENGTH} caracteres.` } };
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return { data: null, error: { message: 'No autenticado' } };
    }

    const payload = {
      conversation_id: conversationId,
      sender_id: userId,
      content: trimmed,
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const result = await executeWrite(
      supabase
        .from('messages')
        .insert(payload)
        .select(
          `
          *,
          reply_to:reply_to_message_id (
            id,
            content,
            sender_id,
            created_at
          )
        `,
        )
        .single(),
    );

    if (result.error) {
      return { data: null, error: mapMessageSendError(result.error) };
    }

    void dispatchMessagePushNotification(conversationId, userId, result.data);

    return result;
  },

  getConversationSendState: async (conversationId) => {
    if (!conversationId) {
      return { data: { canSend: false, blockedReason: null }, error: null };
    }

    const { data, error } = await supabase.rpc('get_conversation_send_state', {
      p_conversation_id: conversationId,
    });

    if (error) {
      return {
        data: {
          canSend: false,
          blockedReason: 'No se pudo verificar si puedes enviar mensajes.',
        },
        error,
      };
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: {
        canSend: Boolean(row?.can_send),
        blockedReason: row?.blocked_reason ?? null,
      },
      error: null,
    };
  },

  markConversationRead: async (conversationId) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { data: null, error: { message: 'No autenticado' } };

    return executeWrite(
      supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .select('*')
        .single(),
    );
  },

  markMessageNotificationsRead: async (conversationId) => {
    if (!conversationId) return { error: null };

    const { error } = await supabase.rpc('mark_message_notifications_read', {
      p_conversation_id: conversationId,
    });

    return { error };
  },

  upsertConversationActiveView: async (conversationId) => {
    if (!conversationId) return { error: null };

    const { error } = await supabase.rpc('upsert_conversation_active_view', {
      p_conversation_id: conversationId,
    });

    return { error };
  },

  clearConversationActiveView: async (conversationId) => {
    if (!conversationId) return { error: null };

    const { error } = await supabase.rpc('clear_conversation_active_view', {
      p_conversation_id: conversationId,
    });

    return { error };
  },

  getTotalUnreadCount: async (userId) => {
    if (!userId) return { count: 0, error: null };

    const { data, error } = await supabase.rpc('get_total_unread_messages_count', {
      p_user_id: userId,
    });

    return { count: Number(data ?? 0), error };
  },

  getParticipantSummaries: async (userIds = []) => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueIds.length) return { data: [], error: null };

    const [candidateResult, companyResult] = await Promise.all([
      supabase
        .from('candidate_profiles_public')
        .select('user_id, full_name, avatar_path, headline, sector')
        .in('user_id', uniqueIds),
      supabase
        .from('company_profiles_public')
        .select('user_id, company_name, logo_path, company_type, sector')
        .in('user_id', uniqueIds),
    ]);

    if (candidateResult.error) return { data: [], error: candidateResult.error };
    if (companyResult.error) return { data: [], error: companyResult.error };

    const profileByUserId = new Map();
    for (const profile of candidateResult.data ?? []) {
      profileByUserId.set(profile.user_id, profile);
    }
    for (const profile of companyResult.data ?? []) {
      profileByUserId.set(profile.user_id, profile);
    }

    return {
      data: uniqueIds.map((userId) =>
        mapParticipantSummary(profileByUserId.get(userId), userId),
      ),
      error: null,
    };
  },

  getConversationParticipants: async (conversationId) => {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, last_read_at')
      .eq('conversation_id', conversationId);

    return { data: data ?? [], error };
  },

  /**
   * Server search over own conversations (participant names + last message).
   * Empty query → { data: [] } (caller should show the full inbox list).
   */
  searchConversations: async (
    query,
    { limit = MESSAGE_SEARCH_PAGE_SIZE, offset = 0 } = {},
  ) => {
    const trimmed = String(query ?? '').trim();
    if (!trimmed) return { data: [], error: null, hasMore: false };

    const { data: rows, error } = await supabase.rpc('search_user_conversations', {
      p_query: trimmed,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) return { data: [], error, hasMore: false };

    const otherUserIds = [...new Set((rows ?? []).map((row) => row.other_user_id))];
    const summariesResult = await messagesService.getParticipantSummaries(otherUserIds);
    const summaryMap = new Map(
      (summariesResult.data ?? []).map((item) => [item.userId, item]),
    );

    const conversations = (rows ?? []).map((row) => ({
      id: row.conversation_id,
      createdAt: row.created_at,
      otherParticipant:
        summaryMap.get(row.other_user_id) ?? mapParticipantSummary(null, row.other_user_id),
      otherLastReadAt: row.other_last_read_at,
      myLastReadAt: row.my_last_read_at,
      lastMessage: row.last_message_id
        ? {
            id: row.last_message_id,
            content: row.last_message_content,
            senderId: row.last_message_sender_id,
            createdAt: row.last_message_created_at,
          }
        : null,
      unreadCount: Number(row.unread_count ?? 0),
    }));

    return {
      data: conversations,
      error: null,
      hasMore: conversations.length === limit,
    };
  },

  /**
   * Server search inside one conversation. Cursor = older than last result.
   */
  searchConversationMessages: async (
    conversationId,
    query,
    { limit = MESSAGE_SEARCH_PAGE_SIZE, cursor = null } = {},
  ) => {
    const trimmed = String(query ?? '').trim();
    if (!conversationId || !trimmed) return { data: [], error: null, hasMore: false };

    const { data: rows, error } = await supabase.rpc('search_conversation_messages', {
      p_conversation_id: conversationId,
      p_query: trimmed,
      p_limit: limit,
      p_before_created_at: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
    });

    if (error) return { data: [], error, hasMore: false };

    const messages = (rows ?? []).map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      content: row.content,
      createdAt: row.created_at,
      snippet: row.snippet ?? row.content,
    }));

    return {
      data: messages,
      error: null,
      hasMore: messages.length === limit,
    };
  },

  /**
   * Load a message window around an anchor for jump-to-search-hit.
   * Empty data means the message is gone or inaccessible.
   */
  getMessagesAround: async (
    conversationId,
    messageId,
    { before = MESSAGES_PAGE_SIZE, after = 10 } = {},
  ) => {
    if (!conversationId || !messageId) return { data: [], error: null, found: false };

    const { data, error } = await supabase.rpc('get_conversation_messages_around', {
      p_conversation_id: conversationId,
      p_message_id: messageId,
      p_before: before,
      p_after: after,
    });

    if (error) return { data: [], error, found: false };

    const rows = data ?? [];
    return {
      data: rows,
      error: null,
      found: rows.some((row) => row.id === messageId),
    };
  },
};
