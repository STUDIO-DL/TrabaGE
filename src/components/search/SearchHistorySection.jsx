import AppIcon from '../common/AppIcon';
import { Clock, Search, Trash2, X, ICON_SIZES } from '../../constants/icons';
import EmptyState from '../common/EmptyState';

export default function SearchHistorySection({
  history = [],
  onSelect,
  onRemove,
  onClear,
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        variant="soft"
        icon={Search}
        title="Empieza a buscar"
        description="Encuentra usuarios, empresas y empleos en TrabaGE."
      />
    );
  }

  return (
    <section aria-label="Búsquedas recientes" className="px-space-base py-space-md">
      <div className="mb-space-sm flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs text-body-small font-semibold text-app-text">
          <AppIcon icon={Clock} size={ICON_SIZES.sm} className="text-app-muted" />
          Recientes
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-caption font-medium text-primary-600 transition-colors duration-fast hover:text-primary-700"
        >
          Borrar todo
        </button>
      </div>

      <ul className="divide-y divide-app-border rounded-radius-lg border border-app-border bg-app-card">
        {history.map((item) => (
          <li key={item} className="group flex items-center gap-space-sm">
            <button
              type="button"
              onClick={() => onSelect?.(item)}
              className="flex min-w-0 flex-1 items-center gap-space-sm px-space-base py-space-md text-left transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={Clock} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />
              <span className="truncate text-body-small text-app-text">{item}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove?.(item)}
              className="mr-space-sm inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-subtle opacity-70 transition-opacity duration-fast hover:bg-error-50 hover:text-error-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Eliminar búsqueda "${item}"`}
            >
              <AppIcon icon={X} size={ICON_SIZES.sm} />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-space-sm flex items-center gap-space-xs text-caption text-app-subtle">
        <AppIcon icon={Trash2} size={12} />
        Toca una búsqueda para repetirla
      </p>
    </section>
  );
}
