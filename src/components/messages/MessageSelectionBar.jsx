import AppIcon from '../common/AppIcon';
import { ArrowLeft, Copy, Trash2, ICON_SIZES } from '../../constants/icons';
import { topBarOuterClass, topBarInnerClass } from '../layout/TopBar';

/**
 * Contextual selection AppBar (replaces normal chat header while selecting).
 */
export default function MessageSelectionBar({
  selectedCount = 0,
  canCopy = true,
  canDelete = false,
  onCancel,
  onCopy,
  onDelete,
  className = '',
}) {
  const countLabel =
    selectedCount === 1 ? '1 seleccionado' : `${selectedCount} seleccionados`;

  return (
    <header
      className={[
        topBarOuterClass,
        'animate-[motionFadeUp_var(--motion-normal)_var(--ease-out)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label="Selección de mensajes"
    >
      <div className={topBarInnerClass}>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-touch shrink-0 items-center gap-space-xs rounded-radius-sm px-space-sm py-space-sm text-body-small font-medium text-app-muted transition-colors duration-fast hover:bg-app-surface hover:text-app-text"
          aria-label="Cancelar selección"
        >
          <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
          <span className="hidden sm:inline">Cancelar</span>
        </button>

        <p className="min-w-0 flex-1 truncate text-subtitle font-semibold text-app-text">
          {countLabel}
        </p>

        <div className="flex shrink-0 items-center gap-space-xs">
          <button
            type="button"
            onClick={onCopy}
            disabled={!canCopy}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast hover:bg-app-surface hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Copiar"
            title="Copiar"
          >
            <AppIcon icon={Copy} size={ICON_SIZES.md} />
          </button>

          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/40"
              aria-label="Eliminar"
              title="Eliminar"
            >
              <AppIcon icon={Trash2} size={ICON_SIZES.md} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
