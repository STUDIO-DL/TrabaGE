import AppIcon from '../common/AppIcon';
import { JOB_SORT_OPTIONS } from '../../constants/jobSort';
import { ChevronDown, ICON_COLORS, ICON_SIZES } from '../../constants/icons';

export default function JobsToolbar({ count = 0, sort = 'recent', onSortChange }) {
  const sortLabel = JOB_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Más recientes';

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-gray-600">
        <span className="font-semibold text-gray-900">{count}</span> empleos disponibles
      </p>

      <label className="relative inline-flex shrink-0 items-center gap-1 text-gray-600">
        <span className="hidden sm:inline">Ordenar por:</span>
        <select
          value={sort}
          onChange={(e) => onSortChange?.(e.target.value)}
          className="appearance-none rounded-lg border-0 bg-transparent py-1 pl-0 pr-5 text-sm font-semibold text-gray-900 outline-none focus:ring-0"
          aria-label="Ordenar empleos"
        >
          {JOB_SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <AppIcon
          icon={ChevronDown}
          size={ICON_SIZES.default}
          className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
        />
        <span className="sr-only">{sortLabel}</span>
      </label>
    </div>
  );
}
