import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import SearchBarTrigger from '../search/SearchBarTrigger';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';
import { Bell, Filter, ICON_SIZES } from '../../constants/icons';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath } from '../../constants/roles';

export default function CompanyFeedHeader() {
  const { unreadCount } = useNotifications();
  const { role } = useAuth();
  const notificationsPath = rolePath(role || ROLES.BUSINESS, '/notifications');

  return (
    <header className={topBarOuterClass}>
      <div className="mx-auto max-w-lg">
        <div className={topBarInnerClass}>
          <SearchBarTrigger
            className="min-w-0 flex-1"
            placeholder="Buscar usuarios, empresas y empleos…"
            variant="rounded"
          />
          <Link
            to={notificationsPath}
            className="relative inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface"
            aria-label="Notificaciones"
          >
            <AppIcon icon={Bell} size={ICON_SIZES.md} />
            {unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-radius-circular bg-primary-600 ring-2 ring-app-card" />
            ) : null}
          </Link>
        </div>

        <div className="flex items-center gap-space-sm px-space-base pb-space-md">
          <button
            type="button"
            className="inline-flex h-10 w-10 min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-md border border-app-border bg-app-card text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface"
            aria-label="Filtros"
          >
            <AppIcon icon={Filter} size={ICON_SIZES.default} />
          </button>
          <span className="inline-block border-b-2 border-primary-600 pb-space-sm text-body-small font-medium text-primary-600">
            Para ti
          </span>
        </div>
      </div>
    </header>
  );
}
