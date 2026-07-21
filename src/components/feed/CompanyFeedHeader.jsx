import SearchBarTrigger from '../search/SearchBarTrigger';
import MessagesButton from '../messages/MessagesButton';
import NotificationBellButton from '../notifications/NotificationBellButton';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';

export default function CompanyFeedHeader() {
  return (
    <header className={topBarOuterClass}>
      <div className={topBarInnerClass}>
        <SearchBarTrigger
          className="min-w-0 flex-1"
          placeholder="Buscar usuarios y empresas…"
        />
        <MessagesButton />
        <NotificationBellButton />
      </div>
    </header>
  );
}
