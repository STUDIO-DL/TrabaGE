import AppIcon from '../common/AppIcon';
import { ICON_SIZES, Pencil, Trash2 } from '../../constants/icons';
import { profileSectionCardClass } from './profileLayoutClasses';

export { profileSectionCardClass };

export const profileSectionTitleClass =
  'text-user-content text-body font-semibold tracking-tight text-app-text';

function EditActionButton({ onClick, label = 'Editar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-space-xs text-caption font-medium text-primary-600 transition-colors hover:text-primary-700"
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
      className="inline-flex items-center gap-space-xs text-caption font-medium text-error-600 transition-colors hover:text-error-700"
    >
      <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
      {label}
    </button>
  );
}

function SectionHeaderAction({ isEditAction, addLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-space-xs text-caption font-medium text-primary-600 transition-colors hover:text-primary-700"
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
  const scrollClass = id ? ' scroll-mt-24' : '';

  // Visitors never see empty sections
  if (isEmpty && !isOwn) return null;

  // Own empty sections: same card shell, compact body
  if (isEmpty && isOwn) {
    return (
      <section id={id} className={`${profileSectionCardClass}${scrollClass}`}>
        <div className="flex items-center justify-between gap-space-md">
          <div className="min-w-0">
            <h3 className={profileSectionTitleClass}>{title}</h3>
            <p className="mt-space-xs text-caption text-app-subtle">{emptyText}</p>
          </div>
          {onAdd ? (
            <SectionHeaderAction
              isEditAction={isEditAction}
              addLabel={addLabel}
              onClick={onAdd}
            />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={`${profileSectionCardClass}${scrollClass}`}>
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <h3 className={`${profileSectionTitleClass} min-w-0 flex-1`}>{title}</h3>
        {isOwn && onAdd ? (
          <SectionHeaderAction
            isEditAction={isEditAction}
            addLabel={addLabel}
            onClick={onAdd}
          />
        ) : null}
      </div>

      {children}

      {footerLabel ? (
        <button
          type="button"
          onClick={onFooterClick}
          className="mt-space-md text-caption font-medium text-primary-600 hover:text-primary-700"
        >
          {footerLabel}
        </button>
      ) : null}
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
  children,
}) {
  return (
    <div className="border-b border-app-divider py-space-md first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-user-content font-semibold text-app-text">{title || '—'}</p>
        {subtitle ? (
          <p className="text-user-content mt-space-xs text-body-small text-app-muted">{subtitle}</p>
        ) : null}
        {meta ? (
          <p className="text-user-content mt-space-xs text-caption leading-relaxed text-app-subtle">
            {meta}
          </p>
        ) : null}
        {children}
        {isOwn && (onEdit || onDelete) ? (
          <div className="mt-space-sm flex gap-space-md">
            {onEdit ? <EditActionButton onClick={onEdit} /> : null}
            {onDelete ? <DeleteActionButton onClick={onDelete} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionItemActions({ isOwn, onEdit, onDelete }) {
  if (!isOwn) return null;
  return (
    <div className="mt-space-sm flex gap-space-md">
      {onEdit ? <EditActionButton onClick={onEdit} /> : null}
      {onDelete ? <DeleteActionButton onClick={onDelete} /> : null}
    </div>
  );
}
