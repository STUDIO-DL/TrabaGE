import AppIcon from '../common/AppIcon';
import { ICON_COLORS, ICON_SIZES, Pencil, Trash2 } from '../../constants/icons';
import { SECTION_ICON_TONES } from './ProfileIcons';

function EditActionButton({ onClick, label = 'Editar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
    >
      <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
      {label}
    </button>
  );
}

function DeleteActionButton({ onClick, label = 'Eliminar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
    >
      <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
      {label}
    </button>
  );
}

export default function ProfileSectionCard({
  id,
  icon,
  iconTone = 'about',
  title,
  isOwn,
  onAdd,
  addLabel = 'Añadir',
  footerLabel,
  onFooterClick,
  isEmpty,
  emptyText = 'Sin información.',
  children,
}) {
  const toneClass = SECTION_ICON_TONES[iconTone] ?? SECTION_ICON_TONES.about;
  const isEditAction = addLabel === 'Editar';

  if (isEmpty && !isOwn) return null;

  return (
    <section id={id} className="surface-card p-space-md">
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          {icon && (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-md ${toneClass}`}
            >
              <AppIcon icon={icon} size={ICON_SIZES.default} className={ICON_COLORS.default} />
            </span>
          )}
          <h3 className="text-subtitle font-semibold text-app-text">{title}</h3>
        </div>
        {isOwn && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {isEditAction ? (
              <>
                <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
                Editar
              </>
            ) : (
              <>+ {addLabel}</>
            )}
          </button>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm text-app-subtle">{emptyText}</p>
      ) : (
        children
      )}

      {footerLabel && !isEmpty && (
        <button
          type="button"
          onClick={onFooterClick}
          className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {footerLabel}
        </button>
      )}
    </section>
  );
}

export function ProfileEntryRow({
  title,
  subtitle,
  meta,
  isOwn,
  onEdit,
  onDelete,
  entryIcon,
  entryIconTone = 'experience',
}) {
  const toneClass = SECTION_ICON_TONES[entryIconTone] ?? SECTION_ICON_TONES.experience;

  return (
    <div className="flex gap-3 border-b border-app-divider py-4 first:pt-0 last:border-0 last:pb-0">
      {entryIcon ? (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
        >
          <AppIcon icon={entryIcon} size={ICON_SIZES.lg} className={ICON_COLORS.default} />
        </span>
      ) : (
        <div className="h-11 w-11 shrink-0 rounded-lg bg-app-surface" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-app-text">{title || '—'}</p>
        {subtitle && <p className="mt-0.5 text-sm text-app-muted">{subtitle}</p>}
        {meta && <p className="mt-1 text-xs leading-relaxed text-app-subtle">{meta}</p>}
        {isOwn && (onEdit || onDelete) && (
          <div className="mt-2 flex gap-3">
            {onEdit && <EditActionButton onClick={onEdit} />}
            {onDelete && <DeleteActionButton onClick={onDelete} />}
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionItemActions({ isOwn, onEdit, onDelete }) {
  if (!isOwn) return null;
  return (
    <div className="mt-2 flex gap-3">
      {onEdit && <EditActionButton onClick={onEdit} />}
      {onDelete && <DeleteActionButton onClick={onDelete} />}
    </div>
  );
}
