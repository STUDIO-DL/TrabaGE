import Input from '../ui/Input';
import AppIcon from '../common/AppIcon';
import { Filter, Search, ICON_SIZES } from '../../constants/icons';

export default function JobsSearchBar({ query = '', onQueryChange, onFiltersToggle, filtersOpen = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          type="search"
          name="jobSearch"
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder="Buscar por título, ciudad, empresa o palabra clave..."
          icon={Search}
          className="mb-0"
        />
      </div>
      <button
        type="button"
        onClick={onFiltersToggle}
        aria-expanded={filtersOpen}
        className={[
          'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
          filtersOpen
            ? 'border-primary-200 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        ].join(' ')}
      >
        <AppIcon icon={Filter} size={ICON_SIZES.default} />
        Filtros
      </button>
    </div>
  );
}
