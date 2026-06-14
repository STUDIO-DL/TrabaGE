import { JOB_SORT_OPTIONS } from '../../constants/jobSort';
import { IconChevronDown } from './JobIcons';

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
        <IconChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <span className="sr-only">{sortLabel}</span>
      </label>
    </div>
  );
}
