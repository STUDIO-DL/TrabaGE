import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/common/EmptyState';
import { JobListSkeleton } from '../../components/common/Skeleton';
import { NoJobs } from '../../assets/empty-states';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath } from '../../constants/roles';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
import { getJobTypeLabel } from '../../constants/jobTypes';
import { getWorkModeLabel } from '../../constants/workModes';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

const STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Publicada',
  paused: 'Pausada',
  closed: 'Cerrada',
};

const STATUS_VARIANTS = {
  draft: 'default',
  active: 'success',
  paused: 'pending',
  closed: 'default',
};

function jobSubtitle(job) {
  return [job.city, getJobTypeLabel(job.job_type), getWorkModeLabel(job.work_mode)]
    .filter(Boolean)
    .join(' · ');
}

export default function CompanyJobs() {
  const navigate = useNavigate();
  const { user, isPreviewMode, role } = useAuth();
  const base = role || ROLES.BUSINESS;
  const { showToast } = useNotificationContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchJobs = useCallback(async () => {
    if (!user?.id || isPreviewMode) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await jobsService.getCompanyJobs(user.id);
    setJobs(error ? [] : data ?? []);
    setLoading(false);
    if (error) showToast('No se pudieron cargar tus ofertas.', 'error');
  }, [isPreviewMode, showToast, user?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const visibleJobs = useMemo(
    () => (filter === 'all' ? jobs : jobs.filter((job) => job.status === filter)),
    [filter, jobs],
  );

  const runJobAction = async (job, action) => {
    setActionId(job.id);
    const result = await action();
    setActionId(null);

    if (result.error) {
      showToast(getSupabaseErrorMessage(result.error), 'error');
      return result;
    }

    await fetchJobs();
    return result;
  };

  const handleDelete = (job) => {
    const ok = window.confirm('¿Eliminar esta oferta? Esta acción no se puede deshacer.');
    if (!ok) return;

    runJobAction(job, () => jobsService.deleteJob(job.id)).then(() => {
      showToast('Oferta eliminada', 'success');
    });
  };

  const handleDuplicate = (job) => {
    runJobAction(job, () => jobsService.duplicateJob(job)).then(() => {
      showToast('Oferta duplicada como borrador', 'success');
    });
  };

  const handleStatus = (job, status, message) => {
    runJobAction(job, () => jobsService.updateJobStatus(job.id, status)).then(async (result) => {
      if (result?.error) return;
      if (status === 'active' && job.status !== 'active') {
        await jobsService.notifyJobPublished(result.data);
      }
      showToast(message, 'success');
    });
  };

  return (
    <PageContainer backButton bottomNav={false}>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'draft', 'paused', 'closed'].map((value) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? 'primary' : 'secondary'}
                onClick={() => setFilter(value)}
              >
                {value === 'all' ? 'Todas' : STATUS_LABELS[value]}
              </Button>
            ))}
          </div>
          <Link to={rolePath(base, '/jobs/create')}>
            <Button size="sm">Crear oferta</Button>
          </Link>
        </div>

        {loading ? (
          <JobListSkeleton count={3} />
        ) : visibleJobs.length === 0 ? (
          <EmptyState
            image={NoJobs}
            title={jobs.length === 0 ? 'Publica tu primera oferta' : 'Nada con este filtro'}
            description={
              jobs.length === 0
                ? 'Cuando publiques, podrás gestionar candidatos y estados desde aquí.'
                : 'Prueba otro estado o crea una oferta nueva.'
            }
            actionLabel="Crear oferta"
            onAction={() => navigate(rolePath(base, '/jobs/create'))}
          />
        ) : (
          visibleJobs.map((job) => (
            <Card key={job.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{job.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{jobSubtitle(job)}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {job.applications_count ?? 0} postulaciones
                  </p>
                </div>
                <Badge
                  label={STATUS_LABELS[job.status] ?? job.status}
                  variant={STATUS_VARIANTS[job.status] ?? 'default'}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to={rolePath(base, `/jobs/${job.id}/edit`)}>
                  <Button size="sm" variant="secondary">Editar</Button>
                </Link>
                {job.status !== 'active' && (
                  <Button
                    size="sm"
                    loading={actionId === job.id}
                    onClick={() => handleStatus(job, 'active', 'Oferta publicada')}
                  >
                    Publicar
                  </Button>
                )}
                {job.status === 'active' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionId === job.id}
                    onClick={() => handleStatus(job, 'paused', 'Oferta pausada')}
                  >
                    Pausar
                  </Button>
                )}
                {job.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionId === job.id}
                    onClick={() => handleStatus(job, 'closed', 'Oferta cerrada')}
                  >
                    Cerrar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionId === job.id}
                  onClick={() => handleDuplicate(job)}
                >
                  Duplicar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={actionId === job.id}
                  onClick={() => handleDelete(job)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
