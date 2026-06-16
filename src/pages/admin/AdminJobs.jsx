import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';

function getJobDisplayStatus(job) {
  if (job.admin_hidden) return { key: 'hidden', label: 'Oculta' };
  return { key: job.status, label: job.status };
}

export default function AdminJobs() {
  const { showToast } = useNotificationContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await adminService.getJobs();
    if (error) showToast(error.message, 'error');
    setJobs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleToggleHidden = async (job) => {
    setActionId(job.id);
    const nextHidden = !job.admin_hidden;
    const { error } = await adminService.setJobHidden(job.id, nextHidden);
    setActionId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(nextHidden ? 'Oferta oculta' : 'Oferta restaurada', 'success');
    await loadJobs();
  };

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
                window.open(`/candidate/jobs/${row.id}`, '_blank', 'noopener,noreferrer')
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
              {row.admin_hidden ? 'Restaurar' : 'Ocultar'}
            </Button>
          </div>
        ),
      },
    ],
    [actionId],
  );

  return (
    <AdminTable
      columns={columns}
      rows={jobs.map((job) => ({ ...job, id: job.id }))}
      loading={loading}
      emptyMessage="No hay ofertas de trabajo."
    />
  );
}
