import AppIcon from '../../common/AppIcon';
import {
  Briefcase,
  Clock,
  Newspaper,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import DashboardSectionEmpty from './DashboardSectionEmpty';
import { formatRelativeTime } from '../../../features/company-dashboard/dashboardFormatters';

const TYPE_ICON = {
  application: Users,
  follow: Users,
  job_published: Briefcase,
  post: Newspaper,
};

export default function DashboardActivityFeed({ items = [] }) {
  return (
    <section className="surface-card h-full">
      <div className="border-b border-app-divider px-space-md py-space-md">
        <h2 className="text-body font-semibold text-app-text">Actividad</h2>
      </div>

      {items.length === 0 ? (
        <DashboardSectionEmpty
          icon={Clock}
          title="Sin actividad reciente"
          description="Aquí verás candidaturas, seguidores y publicaciones nuevas."
          compact
        />
      ) : (
        <ul className="divide-y divide-app-divider">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type] || Clock;
            return (
              <li key={item.id} className="flex gap-space-sm px-space-md py-space-md">
                <AppIcon icon={Icon} size={ICON_SIZES.sm} className="mt-0.5 shrink-0 text-app-subtle" />
                <div className="min-w-0 flex-1">
                  <p className="text-caption text-app-subtle">{formatRelativeTime(item.at)}</p>
                  <p className="mt-0.5 text-body-small font-medium text-app-text">{item.title}</p>
                  {item.detail ? (
                    <p className="mt-0.5 text-caption leading-relaxed text-app-muted">{item.detail}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
