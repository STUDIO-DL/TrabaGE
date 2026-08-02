import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import { Reply, ICON_SIZES } from '../../constants/icons';
import { formatMessageTime } from '../../utils/formatDate';

const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 72;
const SWIPE_ACTIVATE_ANGLE = 1.2;
const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_PX = 10;

function previewText(content) {
  const text = String(content ?? '').trim();
  if (!text) return 'Este mensaje ya no está disponible.';
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/**
 * Presentational message bubble. Selection / long-press callbacks come from the parent.
 */
export default function MessageBubble({
  message,
  isOwn,
  isRead,
  avatar,
  showAvatar = false,
  replyAuthorName = '',
  highlighted = false,
  selected = false,
  selectionActive = false,
  onReply,
  onOpenReply,
  onLongPress,
  onSelectPress,
}) {
  const rowRef = useRef(null);
  const pointerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(pointer: fine)');
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const replyTo = message?.reply_to ?? null;
  const hasReplyRef = Boolean(message?.reply_to_message_id);
  const replyMissing = hasReplyRef && !replyTo;
  const replyPreview = replyMissing
    ? 'Este mensaje ya no está disponible.'
    : previewText(replyTo?.content);

  const replyProgress = Math.min(1, Math.max(0, offsetX / SWIPE_THRESHOLD));
  const swipeEnabled = Boolean(onReply) && !message?.optimistic && !selectionActive;

  const resetSwipe = useCallback(() => {
    setOffsetX(0);
    setDragging(false);
    pointerRef.current = null;
  }, []);

  const triggerReply = useCallback(() => {
    onReply?.(message);
  }, [message, onReply]);

  const fireLongPress = useCallback(() => {
    longPressFiredRef.current = true;
    onLongPress?.(message);
  }, [message, onLongPress]);

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    longPressFiredRef.current = false;

    if (onLongPress && !message?.optimistic) {
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        fireLongPress();
      }, LONG_PRESS_MS);
    }

    if (finePointer || !swipeEnabled) return;

    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      locked: null,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (event) => {
    const dxFromStart = pointerRef.current
      ? event.clientX - pointerRef.current.startX
      : 0;
    const dyFromStart = pointerRef.current
      ? event.clientY - pointerRef.current.startY
      : 0;

    if (
      longPressTimerRef.current != null &&
      (Math.abs(dxFromStart) > LONG_PRESS_MOVE_PX || Math.abs(dyFromStart) > LONG_PRESS_MOVE_PX)
    ) {
      clearLongPressTimer();
    }

    const state = pointerRef.current;
    if (!state || state.id !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (state.locked == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * SWIPE_ACTIVATE_ANGLE || dx < 0) {
        state.locked = 'vertical';
        clearLongPressTimer();
        resetSwipe();
        return;
      }
      state.locked = 'horizontal';
      clearLongPressTimer();
      setDragging(true);
    }

    if (state.locked !== 'horizontal') return;

    event.preventDefault();
    setOffsetX(Math.max(0, Math.min(SWIPE_MAX, dx)));
  };

  const onPointerUp = (event) => {
    clearLongPressTimer();
    const state = pointerRef.current;
    const firedLongPress = longPressFiredRef.current;
    longPressFiredRef.current = false;

    if (state && state.id === event.pointerId) {
      const shouldReply = state.locked === 'horizontal' && offsetX >= SWIPE_THRESHOLD;
      resetSwipe();
      if (shouldReply && !firedLongPress) triggerReply();
      return;
    }

    // Tap while selection mode is active → toggle/select
    if (selectionActive && !firedLongPress && onSelectPress && !message?.optimistic) {
      onSelectPress(message);
    }
  };

  const onPointerCancel = () => {
    clearLongPressTimer();
    longPressFiredRef.current = false;
    resetSwipe();
  };

  const onContextMenu = (event) => {
    // Desktop: right-click enters selection (same as long-press).
    if (!onLongPress || message?.optimistic) return;
    event.preventDefault();
    onLongPress(message);
  };

  const bubbleClass = useMemo(
    () =>
      [
        'break-words rounded-radius-lg px-space-md py-space-sm transition-[transform,box-shadow,background-color] duration-fast ease-out',
        isOwn
          ? 'rounded-br-sm bg-primary-600 text-white shadow-sm'
          : 'rounded-bl-sm bg-white text-app-text shadow-sm ring-1 ring-inset ring-app-border dark:bg-app-card',
        selected
          ? isOwn
            ? 'ring-2 ring-primary-300 ring-offset-2 ring-offset-[var(--chat-wallpaper-bg)] scale-[1.02]'
            : 'bg-primary-50 ring-2 ring-primary-200 ring-offset-2 ring-offset-[var(--chat-wallpaper-bg)] scale-[1.02] dark:bg-primary-950/40 dark:ring-primary-700'
          : '',
        highlighted && !selected
          ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-[var(--chat-wallpaper-bg)]'
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    [highlighted, isOwn, selected],
  );

  return (
    <div
      ref={rowRef}
      data-message-id={message.id}
      data-selected={selected ? 'true' : undefined}
      className={[
        'group relative flex items-end',
        isOwn ? 'justify-end' : 'justify-start',
        selected ? 'z-[1]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onContextMenu={onContextMenu}
    >
      {!isOwn && showAvatar && avatar ? (
        <div className="mr-space-sm shrink-0">
          <AppAvatar
            type={avatar.avatarType}
            src={avatar.avatarSrc}
            name={avatar.name}
            alt={avatar.name}
            size="sm"
            variant={avatar.avatarVariant ?? 'circular'}
          />
        </div>
      ) : !isOwn && showAvatar ? (
        <div className="mr-space-sm w-7 shrink-0" aria-hidden />
      ) : null}

      <div className="relative min-w-0 max-w-[75%]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
          style={{
            opacity: replyProgress,
            transform: `translateX(${Math.max(0, offsetX - 28)}px)`,
          }}
          aria-hidden
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <AppIcon icon={Reply} size={ICON_SIZES.sm} />
          </span>
        </div>

        <div
          className="touch-pan-y select-none"
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: dragging ? 'none' : 'transform 180ms ease-out',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className={['relative', bubbleClass].join(' ')}>
            {finePointer && onReply && !message?.optimistic && !selectionActive ? (
              <button
                type="button"
                onClick={triggerReply}
                className={[
                  'absolute -top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full',
                  'border border-app-border bg-app-card text-app-muted shadow-sm',
                  'opacity-0 transition-opacity duration-fast group-hover:opacity-100 focus-visible:opacity-100',
                  isOwn ? '-left-3' : '-right-3',
                ].join(' ')}
                aria-label="Responder"
                title="Responder"
              >
                <AppIcon icon={Reply} size={14} />
              </button>
            ) : null}

            {hasReplyRef ? (
              <button
                type="button"
                onClick={() => onOpenReply?.(message.reply_to_message_id)}
                className={[
                  'mb-space-sm w-full rounded-radius-md border-l-2 px-space-sm py-space-xs text-left',
                  isOwn
                    ? 'border-l-white/70 bg-white/15 text-primary-50'
                    : 'border-l-primary-500 bg-app-bg text-app-muted',
                ].join(' ')}
              >
                <p className="truncate text-caption font-semibold">
                  {replyMissing ? 'Mensaje' : replyAuthorName || 'Mensaje'}
                </p>
                <p className="line-clamp-2 text-caption opacity-90">{replyPreview}</p>
              </button>
            ) : null}

            <p className="whitespace-pre-wrap text-body-small leading-relaxed">{message.content}</p>
            <div
              className={[
                'mt-space-xs flex items-center justify-end gap-space-xs text-caption',
                isOwn ? 'text-primary-100' : 'text-app-subtle',
              ].join(' ')}
            >
              <span>{formatMessageTime(message.created_at)}</span>
              {isOwn && isRead ? <span aria-label="Leído">Leído</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** True when the message has copyable text (images-only would return false). */
export function messageHasCopyableText(message) {
  return Boolean(String(message?.content ?? '').trim());
}
