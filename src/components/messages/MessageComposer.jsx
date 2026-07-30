import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';
import { MESSAGE_MAX_LENGTH } from '../../services/messages.service';

const TEXTAREA_MAX_HEIGHT = 160;

function useFinePointer() {
  return useMemo(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(pointer: fine)').matches;
  }, []);
}

function previewText(content) {
  const text = String(content ?? '').trim();
  if (!text) return 'Este mensaje ya no está disponible.';
  return text.length > 100 ? `${text.slice(0, 97)}…` : text;
}

export default function MessageComposer({
  onSend,
  sending = false,
  disabled = false,
  blockedReason = null,
  replyTarget = null,
  onCancelReply,
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);
  const isFinePointer = useFinePointer();
  const isBlocked = Boolean(blockedReason);
  const hasText = Boolean(value.trim());

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  useEffect(() => {
    if (!replyTarget) return;
    textareaRef.current?.focus();
  }, [replyTarget?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled || isBlocked) return;

    const result = await onSend(trimmed, {
      replyToMessageId: replyTarget?.id ?? null,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            content: replyTarget.content,
            sender_id: replyTarget.sender_id,
            created_at: replyTarget.created_at,
          }
        : null,
    });
    if (!result?.error) {
      setValue('');
      onCancelReply?.();
      requestAnimationFrame(() => {
        adjustHeight();
        textareaRef.current?.focus();
      });
    }
  };

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && isFinePointer) {
      event.preventDefault();
      void handleSubmit(event);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-chat-compose=""
      className="border-t border-app-border bg-app-card px-space-base py-space-sm"
    >
      {replyTarget ? (
        <div className="mb-space-sm flex items-start gap-space-sm rounded-radius-md bg-app-surface px-space-sm py-space-sm ring-1 ring-inset ring-app-border">
          <div className="min-w-0 flex-1 border-l-2 border-primary-500 pl-space-sm">
            <p className="truncate text-caption font-semibold text-app-text">
              Respondiendo a {replyTarget.authorName || 'mensaje'}
            </p>
            <p className="line-clamp-2 text-caption text-app-muted">
              {previewText(replyTarget.content)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCancelReply?.()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-app-muted transition hover:bg-app-bg hover:text-app-text"
            aria-label="Cancelar respuesta"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} />
          </button>
        </div>
      ) : null}

      {isBlocked ? (
        <p className="mb-space-sm text-caption text-app-subtle" role="status">
          {blockedReason}
        </p>
      ) : null}

      <div className="flex items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={disabled || sending || isBlocked}
          className={[
            'min-h-[44px] flex-1 resize-none rounded-radius-md border bg-app-card px-space-md py-space-sm',
            'text-base text-app-text outline-none',
            'transition-colors duration-fast ease-out placeholder:text-app-subtle placeholder:opacity-80',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            'disabled:cursor-not-allowed disabled:bg-app-disabled disabled:text-app-text-disabled',
            'border-app-border',
          ].join(' ')}
        />

        <div
          className={[
            'shrink-0 overflow-hidden transition-all duration-fast ease-out',
            hasText
              ? 'ml-space-sm max-w-[7rem] translate-x-0 opacity-100'
              : 'pointer-events-none max-w-0 translate-x-2 opacity-0',
          ].join(' ')}
          aria-hidden={!hasText}
        >
          <Button
            type="submit"
            size="sm"
            loading={sending}
            disabled={disabled || isBlocked || !hasText}
            tabIndex={hasText ? 0 : -1}
            className="whitespace-nowrap"
          >
            Enviar
          </Button>
        </div>
      </div>
    </form>
  );
}
