import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import AppAvatar from '../common/AppAvatar';
import FetchErrorBanner from '../common/FetchErrorBanner';
import Skeleton from '../common/Skeleton';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import { useMessages } from '../../hooks/useMessages';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { isEmployerRole } from '../../constants/roles';
import { messagesService } from '../../services/messages.service';

function ConversationSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-space-md p-space-base" aria-busy="true">
      <div className="flex justify-start">
        <Skeleton className="h-16 w-[70%] rounded-radius-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-14 w-[60%] rounded-radius-lg" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-12 w-[55%] rounded-radius-lg" />
      </div>
    </div>
  );
}

export default function ConversationView({ conversationId, role }) {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const { footerPaddingBottom } = useKeyboard();
  const scrollRef = useRef(null);
  const topSentinelRef = useRef(null);
  const {
    conversations,
    loading: conversationsLoading,
  } = useConversations();
  const {
    messages,
    otherLastReadAt,
    loading,
    loadingMore,
    hasMore,
    error,
    sending,
    sendMessage,
    loadMore,
    refetch,
  } = useMessages(conversationId);

  const otherParticipant = useMemo(() => {
    const match = conversations.find((item) => item.id === conversationId);
    return match?.otherParticipant ?? null;
  }, [conversationId, conversations]);
  const [fallbackParticipant, setFallbackParticipant] = useState(null);

  useEffect(() => {
    if (otherParticipant || !conversationId || !user?.id) return undefined;

    let cancelled = false;

    const loadParticipant = async () => {
      const { data: participants } = await messagesService.getConversationParticipants(conversationId);
      const otherUserId = (participants ?? []).find((row) => row.user_id !== user.id)?.user_id;
      if (!otherUserId || cancelled) return;

      const { data } = await messagesService.getParticipantSummaries([otherUserId]);
      if (!cancelled) {
        setFallbackParticipant(data?.[0] ?? null);
      }
    };

    void loadParticipant();

    return () => {
      cancelled = true;
    };
  }, [conversationId, otherParticipant, user?.id]);

  const displayParticipant = otherParticipant ?? fallbackParticipant;

  const profilePath = displayParticipant?.userId
    ? isEmployerRole(displayParticipant.role)
      ? `/companies/${displayParticipant.userId}`
      : `/profile/${displayParticipant.userId}`
    : null;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading) return;
    node.scrollTop = node.scrollHeight;
  }, [conversationId, loading]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading || loadingMore) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const shouldStickToBottom =
      lastMessage.sender_id === user?.id ||
      lastMessage.optimistic ||
      distanceFromBottom < 120;

    if (shouldStickToBottom) {
      node.scrollTop = node.scrollHeight;
    }
  }, [loading, loadingMore, messages, user?.id]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleSend = async (content) => {
    const result = await sendMessage(content);
    if (result.error) {
      showToast(result.error.message ?? 'No se pudo enviar el mensaje.', 'error');
    }
    return result;
  };

  const headerCenter = displayParticipant ? (
    profilePath ? (
      <Link to={profilePath} className="flex min-w-0 flex-1 items-center gap-space-sm">
        <AppAvatar
          type={displayParticipant.avatarType}
          src={displayParticipant.avatarSrc}
          name={displayParticipant.name}
          alt={displayParticipant.name}
          size="sm"
          variant={displayParticipant.avatarVariant ?? 'circular'}
          className="shrink-0"
        />
        <span className="truncate text-subtitle font-semibold text-app-text">{displayParticipant.name}</span>
      </Link>
    ) : (
      <div className="flex min-w-0 flex-1 items-center gap-space-sm">
        <AppAvatar
          type={displayParticipant.avatarType}
          src={displayParticipant.avatarSrc}
          name={displayParticipant.name}
          alt={displayParticipant.name}
          size="sm"
          variant={displayParticipant.avatarVariant ?? 'circular'}
          className="shrink-0"
        />
        <span className="truncate text-subtitle font-semibold text-app-text">{displayParticipant.name}</span>
      </div>
    )
  ) : conversationsLoading ? (
    <Skeleton className="h-5 w-32" />
  ) : (
    <span className="truncate text-subtitle font-semibold text-app-text">Conversación</span>
  );

  return (
    <PageContainer
      topBar={<TopBar backButton center={headerCenter} />}
      bottomNav={false}
      className="flex min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {error ? (
          <div className="p-space-base">
            <FetchErrorBanner message={error} onRetry={refetch} />
          </div>
        ) : null}

        {loading ? <ConversationSkeleton /> : null}

        {!loading ? (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-space-base py-space-md"
            style={{ paddingBottom: footerPaddingBottom }}
          >
            <div ref={topSentinelRef} className="h-px w-full" aria-hidden="true" />
            {loadingMore ? (
              <p className="mb-space-md text-center text-caption text-app-subtle">Cargando mensajes…</p>
            ) : null}
            {!loadingMore && hasMore ? (
              <p className="mb-space-md text-center text-caption text-app-subtle">Desplázate para ver anteriores</p>
            ) : null}

            <div className="flex flex-col gap-space-md">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                const isRead =
                  isOwn &&
                  otherLastReadAt &&
                  new Date(otherLastReadAt) >= new Date(message.created_at);

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    isRead={Boolean(isRead)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <div style={{ paddingBottom: footerPaddingBottom }}>
          <MessageComposer onSend={handleSend} sending={sending} disabled={loading || Boolean(error)} />
        </div>
      </div>
    </PageContainer>
  );
}
