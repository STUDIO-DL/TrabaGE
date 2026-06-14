export default function ProfileSectionCard({
  icon: Icon,
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
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        {isOwn && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            + {addLabel}
          </button>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
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

export function ProfileEntryRow({ title, subtitle, meta, isOwn, onEdit, onDelete }) {
  return (
    <div className="flex gap-3 border-b border-gray-100 py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="h-12 w-12 shrink-0 rounded-lg bg-primary-50" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{title || '—'}</p>
        {subtitle && <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p>}
        {meta && <p className="mt-1 text-xs leading-relaxed text-gray-400">{meta}</p>}
        {isOwn && (onEdit || onDelete) && (
          <div className="mt-2 flex gap-3">
            {onEdit && (
              <button type="button" onClick={onEdit} className="text-xs font-medium text-primary-600">
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} className="text-xs font-medium text-red-600">
                Eliminar
              </button>
            )}
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
      <button type="button" onClick={onEdit} className="text-xs font-medium text-primary-600">
        Editar
      </button>
      <button type="button" onClick={onDelete} className="text-xs font-medium text-red-600">
        Eliminar
      </button>
    </div>
  );
}
