import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { getReportReasonLabel } from '../../constants/reportReasons';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function AdminReports() {
  const { showToast } = useNotificationContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await adminService.getReports();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
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
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Reporte actualizado', 'success');
    await loadReports();
  };

  const deleteReport = async (report) => {
    if (!window.confirm('¿Eliminar este reporte duplicado? Esta acción no afecta al contenido reportado.')) return;

    setActionId(report.id);
    const { error } = await adminService.deleteReport(report.id);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Reporte eliminado', 'success');
    await loadReports();
  };

  const filteredReports = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return reports;

    return reports.filter((report) =>
      [
        report.target_label,
        report.target_type,
        report.reason_code,
        report.reason_details,
        report.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, reports]);

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
        key: 'details',
        label: 'Detalle',
        render: (row) => (
          <span className="block max-w-xs truncate text-gray-600">
            {row.reason_details || '—'}
          </span>
        ),
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
              Archivar
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.id}
              onClick={() => deleteReport(row)}
            >
              Eliminar duplicado
            </Button>
          </div>
        ),
      },
    ],
    [actionId],
  );

  return (
    <div className="space-y-4">
      <Input
        label="Buscar reportes"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por contenido, tipo, motivo o estado"
      />
      <AdminTable
        columns={columns}
        rows={filteredReports.map((report) => ({ ...report, id: report.id }))}
        loading={loading}
        emptyMessage="No hay reportes."
      />
    </div>
  );
}
