import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import Card from '../ui/Card';
import { ICON_SIZES, ChevronRight } from '../../constants/icons';
import { rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export default function DiscoverCard({ section, count }) {
  const { role } = useAuth();
  const to = rolePath(role, section.pathSuffix);
  const showCount = typeof count === 'number' && count > 0;

  return (
    <Link
      to={to}
      className="group block min-h-touch rounded-radius-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <Card
        elevation={1}
        className="flex h-full flex-col gap-space-sm p-space-md transition-colors duration-fast group-hover:bg-app-surface"
      >
        <div className="flex items-start justify-between gap-space-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600 dark:bg-primary-950/40">
            <AppIcon icon={section.icon} size={ICON_SIZES.default} />
          </span>
          <AppIcon
            icon={ChevronRight}
            size={ICON_SIZES.sm}
            className="shrink-0 text-app-muted transition-transform duration-fast group-hover:translate-x-0.5"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-space-sm">
            <h3 className="text-body-small font-semibold text-app-text">{section.title}</h3>
            {showCount ? (
              <span className="shrink-0 rounded-radius-pill bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-caption text-app-muted">{section.description}</p>
        </div>
      </Card>
    </Link>
  );
}
