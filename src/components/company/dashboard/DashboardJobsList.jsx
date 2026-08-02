import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  Briefcase,
  ChevronRight,
  Eye,
  Pencil,
  Users,
  X,
  ICON_SIZES,
} from '../../../constants/icons';
import Button from '../../ui/Button';
import DashboardSectionEmpty from './DashboardSectionEmpty';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import { formatDaysActive } from '../../../features/company-dashboard/dashboardFormatters';
import { exitGuestToAuth } from '../../../utils/guestMode';

const STATUS_STYLES = {
  draft: 'bg-app-muted',
  active: 'bg-success-600',
  paused: 'bg-amber-500',
  closed: 'bg-app-subtle',
};

const STATUS_LABEL = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  closed: 'Cerrada',
};

export default function DashboardJobsList({ jobs = [], onCloseJob, closingId = null }) {
  const { role, isPreviewMode } = useAuth();
  const navigate = useNavigate();
  const base = role || ROLES.BUSINESS;
  const isEmpty = !jobs.length;

  return (
    <section className="surface-card flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-app-border px-5 py-4">
        <h2 className="text-base font-semibold text-app-text">Ofertas activas</h2>
        {isPreviewMode ? (
          <button
            type="button"
            onClick={() => exitGuestToAuth(navigate)}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Ver todas
            <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
          </button>
        ) : (
          <Link
            to={rolePath(base, '/jobs')}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Ver todas
            <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
          </Link>
        )}
      </div>

      {isEmpty ? (
        <DashboardSectionEmpty
          icon={Briefcase}
          title="Aún no hay ofertas activas"
          description="Publica tu primera oferta para empezar a recibir candidatos."
        />
      ) : (
        <ul className="divide-y divide-app-border">
          {jobs.map((job) => (
            <li key={job.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[job.status] ?? STATUS_STYLES.active}`}
                      aria-hidden
                    />
                    <span className="text-xs font-medium text-app-muted">
                      {STATUS_LABEL[job.status] || job.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-app-text">{job.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted">
                    <span className="inline-flex items-center gap-1">
                      <AppIcon icon={Eye} size={ICON_SIZES.sm} />
                      {job.views ?? 0} vistas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <AppIcon icon={Users} size={ICON_SIZES.sm} />
                      {job.applications ?? 0} candidaturas
                    </span>
                    <span>Activa {formatDaysActive(job.days_active)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Link to={rolePath(base, `/jobs/${job.id}/edit`)}>
                    <Button variant="secondary" size="sm" type="button">
                      <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
                      Editar
                    </Button>
                  </Link>
                  {job.status !== 'closed' && onCloseJob ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={closingId === job.id}
                      onClick={() => onCloseJob(job)}
                    >
                      <AppIcon icon={X} size={ICON_SIZES.sm} />
                      Cerrar
                    </Button>
                  ) : null}
                  <Link to={rolePath(base, `/applicants?job=${job.id}`)}>
                    <Button variant="ghost" size="sm" type="button">
                      Ver
                    </Button>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto border-t border-app-border p-4">
        <Link to={rolePath(base, '/jobs')}>
          <Button variant="secondary" fullWidth>
            Ver todas las ofertas
          </Button>
        </Link>
      </div>
    </section>
  );
}
