import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { getReportReasonLabel } from '../../constants/reportReasons';
import { formatDate } from '../../utils/formatDate';

export default function AdminReports() {
  const { showToast } = useNotificationContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await adminService.getReports();
    if (error) showToast(error.message, 'error');
    setReports(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const updateStatus = async (reportId, status) => {
    setActionId(reportId);
    const { error } = await adminService.updateReportStatus(reportId, status);
    setActionId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Reporte actualizado', 'success');
    await loadReports();
  };

  const columns = useMemo(
    () => [
      {
        key: 'target',
        label: 'Elemento reportado',
        render: (row) => row.target_label,
      },
      {
        key: 'type',
        label: 'Tipo',
        render: (row) => {
          const labels = { profile: 'Perfil', post: 'Publicación', job: 'Oferta' };
          return labels[row.target_type] ?? row.target_type;
        },
      },
      {
        key: 'reason',
        label: 'Motivo',
        render: (row) => getReportReasonLabel(row.reason_code),
      },
      {
        key: 'created_at',
        label: 'Fecha',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => <AdminStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={actionId === row.id}
              onClick={() => updateStatus(row.id, 'reviewed')}
            >
              Revisar
            </Button>
            <Button
              size="sm"
              loading={actionId === row.id}
              onClick={() => updateStatus(row.id, 'resolved')}
            >
              Resolver
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={actionId === row.id}
              onClick={() => updateStatus(row.id, 'dismissed')}
            >
              Descartar
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
      rows={reports.map((report) => ({ ...report, id: report.id }))}
      loading={loading}
      emptyMessage="No hay reportes pendientes."
    />
  );
}
