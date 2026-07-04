import { useRef } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Bell, Filter, Search, ICON_COLORS, ICON_SIZES } from '../../constants/icons';
import { useNotifications } from '../../hooks/useNotifications';

export default function CompanyFeedHeader({ query = '', onQueryChange }) {
  const { unreadCount } = useNotifications();
  const searchInputRef = useRef(null);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between px-4 pb-3 pt-3">
          <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
          <Link
            to="/company/notifications"
            className="relative rounded-lg p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Notificaciones"
          >
            <AppIcon icon={Bell} size={ICON_SIZES.nav} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white" />
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative min-w-0 flex-1">
            <AppIcon
              icon={Search}
              size={ICON_SIZES.default}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
            />
            <input
              ref={searchInputRef}
              type="search"
              name="companyFeedSearch"
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              placeholder="Buscar candidatos, habilidades, cargos..."
              aria-label="Buscar candidatos, habilidades, cargos"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            aria-label="Filtros"
          >
            <AppIcon icon={Filter} size={ICON_SIZES.default} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <span className="inline-block border-b-2 border-primary-600 pb-2 text-sm font-medium text-primary-600">
            Para ti
          </span>
        </div>
      </div>
    </header>
  );
}
