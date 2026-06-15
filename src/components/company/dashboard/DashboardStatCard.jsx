import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { ChevronRight, ICON_SIZES } from '../../../constants/icons';

const ICON_STYLES = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
};

export default function DashboardStatCard({ icon, tone = 'blue', value, label, linkLabel, to }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${ICON_STYLES[tone]}`}>
          <AppIcon icon={icon} size={ICON_SIZES.default} />
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
      <p className="mt-5 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}
