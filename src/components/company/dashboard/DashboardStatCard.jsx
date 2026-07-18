import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { ChevronRight, ICON_COLORS, ICON_SIZES } from '../../../constants/icons';

const ICON_SURFACE = 'bg-app-surface text-app-text ring-1 ring-app-border dark:bg-app-elevated';

export default function DashboardStatCard({ icon, tone = 'default', value, label, linkLabel, to }) {
  const iconClass = tone === 'positive' ? ICON_COLORS.positive : ICON_COLORS.default;

  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_SURFACE}`}>
          <AppIcon icon={icon} size={ICON_SIZES.default} className={iconClass} />
        </span>
        {to && (
          <Link
            to={to}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            {linkLabel}
            <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
          </Link>
        )}
      </div>
      <p className="mt-space-base text-title font-bold tracking-tight text-app-text">{value}</p>
      <p className="mt-1 text-sm text-app-muted">{label}</p>
    </div>
  );
}
