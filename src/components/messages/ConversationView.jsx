import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import AppAvatar from '../common/AppAvatar';
import FetchErrorBanner from '../common/FetchErrorBanner';
import Skeleton from '../common/Skeleton';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import KeyboardAwareFooter from '../layout/KeyboardAwareFooter';
import { useMessages } from '../../hooks/useMessages';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { isEmployerRole } from '../../constants/roles';
import { messagesService, MESSAGE_WAIT_FOR_REPLY } from '../../services/messages.service';

const BOTTOM_THRESHOLD = 50;
const COMPOSE_INSET_FALLBACK = 72;

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
  const scrollRef = useRef(null);
  const composeRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const topSentinelRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [composeInset, setComposeInset] = useState(COMPOSE_INSET_FALLBACK);
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
    canSend,
    blockedReason,
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

  const checkIsAtBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return true;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    return distance <= BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const node = composeRef.current;
    if (!node) return undefined;

    const measure = () => {
      setComposeInset(node.getBoundingClientRect().height || COMPOSE_INSET_FALLBACK);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, blockedReason, canSend, error]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading) return undefined;

    const handleScroll = () => {
      isAtBottomRef.current = checkIsAtBottom();
    };

    handleScroll();
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, [loading, checkIsAtBottom]);

  useEffect(() => {
    if (loading) return;
    isAtBottomRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom('auto');
      requestAnimationFrame(() => scrollToBottom('auto'));
    });
  }, [conversationId, loading, scrollToBottom]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading || loadingMore) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const shouldStickToBottom =
      lastMessage.sender_id === user?.id ||
      lastMessage.optimistic ||
      isAtBottomRef.current;

    if (shouldStickToBottom) {
      isAtBottomRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
    }
  }, [loading, loadingMore, messages, user?.id, scrollToBottom]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const handleViewportChange = () => {
      if (!isAtBottomRef.current) return;
      requestAnimationFrame(() => scrollToBottom('auto'));
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);
    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, [scrollToBottom]);

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
    isAtBottomRef.current = true;
    const result = await sendMessage(content);
    if (result.error) {
      showToast(result.error.message ?? 'No se pudo enviar el mensaje.', 'error');
    } else {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
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
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-subtitle font-semibold text-app-text">{displayParticipant.name}</span>
          {displayParticipant.subtitle ? (
            <span className="truncate text-caption text-app-subtle">{displayParticipant.subtitle}</span>
          ) : null}
        </div>
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
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-subtitle font-semibold text-app-text">{displayParticipant.name}</span>
          {displayParticipant.subtitle ? (
            <span className="truncate text-caption text-app-subtle">{displayParticipant.subtitle}</span>
          ) : null}
        </div>
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
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <div className="shrink-0 p-space-base">
            <FetchErrorBanner message={error} onRetry={refetch} />
          </div>
        ) : null}

        {loading ? <ConversationSkeleton /> : null}

        {!loading ? (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-space-base py-space-md"
            style={{ paddingBottom: composeInset }}
          >
            <div ref={topSentinelRef} className="h-px w-full" aria-hidden="true" />
            {loadingMore ? (
              <p className="mb-space-md text-center text-caption text-app-subtle">Cargando mensajes…</p>
            ) : null}
            {!loadingMore && hasMore ? (
              <p className="mb-space-md text-center text-caption text-app-subtle">Desplázate para ver anteriores</p>
            ) : null}

            <div className="flex flex-col gap-space-md">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const isRead =
                  isOwn &&
                  otherLastReadAt &&
                  new Date(otherLastReadAt) >= new Date(message.created_at);
                const previousMessage = messages[index - 1];
                const showAvatar = !isOwn && (!previousMessage || previousMessage.sender_id !== message.sender_id);

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    isRead={Boolean(isRead)}
                    avatar={showAvatar ? displayParticipant : null}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
            <div ref={bottomAnchorRef} className="h-px w-full shrink-0" aria-hidden="true" />
          </div>
        ) : null}

        <KeyboardAwareFooter fixed as="div">
          <div ref={composeRef}>
            <MessageComposer
              onSend={handleSend}
              sending={sending}
              disabled={loading || Boolean(error) || !canSend}
              blockedReason={!canSend ? (blockedReason ?? MESSAGE_WAIT_FOR_REPLY) : null}
            />
          </div>
        </KeyboardAwareFooter>
      </div>
    </PageContainer>
  );
}
