import AppIcon from '../common/AppIcon';
import SearchBarTrigger from '../search/SearchBarTrigger';
import MessagesButton from '../messages/MessagesButton';
import NotificationBellButton from '../notifications/NotificationBellButton';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';
import { Filter, ICON_SIZES } from '../../constants/icons';

export default function CompanyFeedHeader() {
  return (
    <header className={topBarOuterClass}>
      <div className="mx-auto max-w-lg">
        <div className={topBarInnerClass}>
          <SearchBarTrigger
            className="min-w-0 flex-1"
            placeholder="Buscar usuarios y empresas…"
          />
          <MessagesButton />
          <NotificationBellButton />
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
