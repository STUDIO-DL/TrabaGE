import AppIcon from '../common/AppIcon';
import { ICON_SIZES, Pencil, Trash2 } from '../../constants/icons';

/** Section headings — text only, no icons. */
export const profileSectionTitleClass =
  'text-user-content text-body font-bold tracking-tight text-app-text sm:text-subtitle';

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
  icon: _icon,
  iconTone: _iconTone,
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
  const isEditAction = addLabel === 'Editar';

  if (isEmpty && !isOwn) return null;

  return (
    <section id={id} className={`surface-card p-space-md${id ? ' scroll-mt-24' : ''}`}>
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <h3 className={`${profileSectionTitleClass} min-w-0 flex-1`}>{title}</h3>
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
  entryIcon: _entryIcon,
  entryIconTone: _entryIconTone,
}) {
  return (
    <div className="border-b border-app-divider py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-user-content font-semibold text-app-text">{title || '—'}</p>
        {subtitle && <p className="text-user-content mt-0.5 text-sm text-app-muted">{subtitle}</p>}
        {meta && <p className="text-user-content mt-1 text-xs leading-relaxed text-app-subtle">{meta}</p>}
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
