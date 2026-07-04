import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import GlobalSearch from '../search/GlobalSearch';
import { Bell, Filter, ICON_SIZES } from '../../constants/icons';
import { useNotifications } from '../../hooks/useNotifications';

export default function CompanyFeedHeader() {
  const { unreadCount } = useNotifications();

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
          <GlobalSearch
            placeholder="Buscar candidatos, empresas, empleos…"
            variant="rounded"
          />
          <button
            type="button"
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
