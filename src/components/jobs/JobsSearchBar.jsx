import SearchBar from '../ui/SearchBar';
import AppIcon from '../common/AppIcon';
import { Filter, ICON_SIZES } from '../../constants/icons';

/** Search dominates; filters are a quiet secondary control. */
export default function JobsSearchBar({ query = '', onQueryChange, onFiltersToggle, filtersOpen = false }) {
  return (
    <div className="flex items-center gap-space-sm">
      <div className="min-w-0 flex-1">
        <SearchBar
          value={query}
          onChange={(value) => onQueryChange?.(value)}
          placeholder="Buscar empleo, ciudad o empresa"
        />
      </div>

      <button
        type="button"
        onClick={onFiltersToggle}
        aria-expanded={filtersOpen}
        aria-label="Filtros"
        className={[
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-md border transition-colors duration-fast ease-out',
          filtersOpen
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-app-border bg-app-card text-app-muted hover:bg-app-surface hover:text-app-text',
        ].join(' ')}
      >
        <AppIcon icon={Filter} size={ICON_SIZES.md} />
      </button>
    </div>
  );
}
