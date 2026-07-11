import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import UserProfileLink from '../../common/UserProfileLink';
import { ChevronRight, Users, ICON_SIZES } from '../../../constants/icons';
import DashboardSectionEmpty from './DashboardSectionEmpty';

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatAppliedAt(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays < 1) return 'Hoy';
  if (diffDays === 1) return 'Hace 1 día';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
];

export default function DashboardRecentCandidates({ candidates }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">Candidatos recientes</h2>
        <Link
          to="/business/applicants"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Ver todos
          <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
        </Link>
      </div>

      {candidates.length === 0 ? (
        <DashboardSectionEmpty
          icon={Users}
          title="Aún no tienes candidatos"
          description="Cuando alguien aplique a tus ofertas, aparecerá aquí."
          compact
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {candidates.map((candidate, index) => (
            <li key={candidate.id}>
              <UserProfileLink
                userId={candidate.user_id}
                name={candidate.full_name}
                layout="row"
                className="px-5 py-4 transition hover:bg-gray-50"
                nameClassName="truncate text-sm font-medium text-gray-900 hover:text-primary-700 transition-colors"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                >
                  {getInitials(candidate.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{candidate.full_name}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{candidate.job_title}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatAppliedAt(candidate.applied_at)}
                </span>
                <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-gray-300" />
              </UserProfileLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
