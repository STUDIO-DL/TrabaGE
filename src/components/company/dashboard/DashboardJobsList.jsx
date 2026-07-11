import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { ChevronRight, Briefcase, ICON_SIZES } from '../../../constants/icons';
import { getJobTypeLabel } from '../../../constants/jobTypes';
import { getWorkModeLabel } from '../../../constants/workModes';
import Button from '../../ui/Button';
import DashboardSectionEmpty from './DashboardSectionEmpty';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';

const STATUS_STYLES = {
  draft: 'bg-gray-400',
  active: 'bg-emerald-500',
  paused: 'bg-amber-400',
  closed: 'bg-gray-300',
};

function getJobSubtitle(job) {
  if (job.work_mode) {
    return `${getWorkModeLabel(job.work_mode)} • ${getJobTypeLabel(job.job_type)}`;
  }
  const parts = [job.city, getJobTypeLabel(job.job_type)].filter(Boolean);
  return parts.join(' • ') || getJobTypeLabel(job.job_type);
}

export default function DashboardJobsList({ jobs }) {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;
  const isEmpty = jobs.length === 0;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">Ofertas de trabajo</h2>
        <Link
          to={rolePath(base, '/jobs')}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Ver todas
          <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
        </Link>
      </div>

      {isEmpty ? (
        <DashboardSectionEmpty
          icon={Briefcase}
          title="Aún no hay ofertas activas"
          description="Publica tu primera oferta para empezar a recibir candidatos."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                to={rolePath(base, `/jobs/${job.id}/edit`)}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-gray-50"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_STYLES[job.status] ?? STATUS_STYLES.active}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{job.title}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{getJobSubtitle(job)}</p>
                </div>
                <p className="shrink-0 text-xs text-gray-500">
                  {job.candidates_count ?? 0} candidatos
                </p>
                <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-gray-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto border-t border-gray-100 p-4">
        <Link to={rolePath(base, '/jobs')}>
          <Button variant="secondary" fullWidth>
            Ver todas las ofertas
          </Button>
        </Link>
      </div>
    </section>
  );
}
