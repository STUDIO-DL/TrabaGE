import { supabase } from '../config/supabase';
import { executeWrite } from '../utils/supabaseMutation';
import { getDisplayName, getDisplayAvatar } from '../utils/displayIdentity';
import { ROLES, isEmployerRole } from '../constants/roles';
import { isOrganizationProfile } from '../utils/orgLabels';
import { notificationsService } from './notifications.service';
import { reportError } from '../utils/logger';

export const MESSAGES_PAGE_SIZE = 20;
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
    avatarSrc: getDisplayAvatar(profile, role),
    avatarType: isEmployer ? 'company' : 'personal',
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
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (cursor?.createdAt) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    return { data: data ?? [], error };
  },

  sendMessage: async (conversationId, content) => {
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

    const result = await executeWrite(
      supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: trimmed,
        })
        .select('*')
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
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'F',location:'messages.service.js:getConversationSendState',message:'send-state RPC error fail-closed',data:{conversationId,canSendReturned:false,errorMessage:error?.message??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
};
