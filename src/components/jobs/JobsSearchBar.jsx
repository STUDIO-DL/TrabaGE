import SearchBar from '../ui/SearchBar';
import AppIcon from '../common/AppIcon';
import NotificationBellButton from '../notifications/NotificationBellButton';
import { Filter, ICON_SIZES } from '../../constants/icons';

export default function JobsSearchBar({ query = '', onQueryChange, onFiltersToggle, filtersOpen = false }) {
  return (
    <div className="flex items-center gap-space-sm">
      <div className="min-w-0 flex-1">
        <SearchBar
          value={query}
          onChange={(value) => onQueryChange?.(value)}
          placeholder="Buscar por título, ciudad, empresa..."
        />
      </div>
      <NotificationBellButton className="h-11 w-11 border border-app-border bg-app-card" />

      <button
        type="button"
        onClick={onFiltersToggle}
        aria-expanded={filtersOpen}
        className={[
          'inline-flex min-h-touch shrink-0 items-center gap-space-sm rounded-radius-md border px-space-md py-space-sm text-body-small font-medium transition-colors duration-fast ease-out',
          filtersOpen
            ? 'border-primary-200 bg-primary-50 text-primary-700'
            : 'border-app-border bg-app-card text-app-muted hover:bg-app-surface',
        ].join(' ')}
      >
        <AppIcon icon={Filter} size={ICON_SIZES.md} />
        Filtros
      </button>
    </div>
  );
}
