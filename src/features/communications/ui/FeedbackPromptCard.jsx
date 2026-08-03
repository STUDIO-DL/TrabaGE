import AppIcon from '../../../components/common/AppIcon';
import { MessageSquare, X, ICON_SIZES } from '../../../constants/icons';
import { DEFAULT_FEEDBACK_CONTENT } from '../domain/constants';

/**
 * Compact floating feedback card (Maps / YouTube / Notion style).
 * X only hides — does not count as a survey response.
 */
export default function FeedbackPromptCard({ campaign, onOpenMore, onHide }) {
  const content = { ...DEFAULT_FEEDBACK_CONTENT, ...(campaign?.content || {}) };

  return (
    <div
      className={[
        'pointer-events-auto fixed inset-x-space-md z-[60] mx-auto w-full max-w-md',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-space-xl',
        'animate-[cardFadeIn_var(--motion-normal)_var(--ease-out)]',
      ].join(' ')}
      role="dialog"
      aria-label={content.cardTitle}
    >
      <div className="flex gap-space-sm rounded-radius-lg border border-app-border bg-app-card p-space-md shadow-elevation-3 dark:border-slate-700">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
          <AppIcon icon={MessageSquare} size={ICON_SIZES.md} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-small font-semibold text-app-text">
            <span aria-hidden>💬 </span>
            {content.cardTitle}
          </p>
          <p className="mt-space-xs text-caption leading-relaxed text-app-muted">
            {content.cardBody}
          </p>
          <div className="mt-space-sm flex items-center gap-space-sm">
            <button
              type="button"
              onClick={onOpenMore}
              className="text-caption font-semibold text-primary-600 transition-colors hover:text-primary-700"
            >
              Más información
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="min-h-touch min-w-touch shrink-0 self-start rounded-radius-sm p-space-xs text-app-subtle transition-colors hover:bg-app-surface hover:text-app-text"
          aria-label="Ocultar"
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      </div>
    </div>
  );
}
