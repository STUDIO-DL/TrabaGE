import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function getJobDisplayStatus(job) {
  if (job.admin_hidden) return { key: 'hidden', label: 'Oculta' };
  return { key: job.status, label: job.status };
}

export default function AdminJobs() {
  const { showToast } = useNotificationContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getJobs();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setJobs(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleToggleHidden = useCallback(async (job) => {
    setActionId(job.id);
    const nextHidden = !job.admin_hidden;
    const { error } = await adminService.setJobModeration(job.id, {
      hidden: nextHidden,
      status: nextHidden ? 'paused' : 'active',
    });
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextHidden ? 'Oferta oculta' : 'Oferta restaurada', 'success');
    await loadJobs();
  }, [loadJobs, showToast]);

  const handleDelete = useCallback(async (job) => {
    if (!window.confirm(`¿Eliminar la oferta "${job.title}" del panel público? Se cerrará y quedará oculta.`)) return;

    setActionId(job.id);
    const { error } = await adminService.deleteJob(job.id);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Oferta cerrada y oculta', 'success');
    await loadJobs();
  }, [loadJobs, showToast]);

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return jobs;

    return jobs.filter((job) =>
      [
        job.title,
        job.company_profiles?.company_name,
        job.city,
        job.status,
        job.job_type,
        job.work_mode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [jobs, query]);

  const columns = useMemo(
    () => [
      { key: 'title', label: 'Título' },
      {
        key: 'company',
        label: 'Empresa',
        render: (row) => row.company_profiles?.company_name ?? '—',
      },
      { key: 'city', label: 'Ciudad', render: (row) => row.city || '—' },
      {
        key: 'applications',
        label: 'Solicitudes',
        render: (row) => row.applications_count ?? 0,
      },
      {
        key: 'created_at',
        label: 'Creada',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => {
          const status = getJobDisplayStatus(row);
          return <AdminStatusBadge status={status.key} label={status.label} />;
        },
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                window.open(`/jobs/${row.id}`, '_blank', 'noopener,noreferrer')
              }
            >
              Ver
            </Button>
            <Button
              size="sm"
              variant={row.admin_hidden ? 'primary' : 'danger'}
              loading={actionId === row.id}
              onClick={() => handleToggleHidden(row)}
            >
              {row.admin_hidden ? 'Reactivar' : 'Suspender'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.id}
              onClick={() => handleDelete(row)}
            >
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleDelete, handleToggleHidden],
  );

  return (
    <div className="space-y-4">
      <Input
        label="Buscar ofertas"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por título, empresa, ciudad o estado"
      />
      <AdminTable
        columns={columns}
        rows={filteredJobs.map((job) => ({ ...job, id: job.id }))}
        loading={loading}
        emptyMessage="No hay ofertas de trabajo."
      />
    </div>
  );
}
