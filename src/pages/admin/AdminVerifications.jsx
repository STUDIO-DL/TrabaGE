import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function AdminVerifications() {
  const { showToast } = useNotificationContext();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectNotes, setRejectNotes] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadVerifications = async () => {
    setLoading(true);
    const { data, error } = await adminService.getAllVerifications();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setVerifications(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const handleApprove = async (id) => {
    setReviewingId(id);
    const { error } = await adminService.reviewVerification(id, 'approved', null);
    setReviewingId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Empresa verificada', 'success');
    await loadVerifications();
  };

  const handleReject = async () => {
    if (!rejectModal.id) return;
    if (!rejectNotes.trim()) {
      showToast('Indica el motivo del rechazo para que la empresa pueda corregirlo.', 'error');
      return;
    }

    setReviewingId(rejectModal.id);
    const { error } = await adminService.reviewVerification(
      rejectModal.id,
      'rejected',
      rejectNotes.trim() || null,
    );
    setReviewingId(null);
    setRejectModal({ open: false, id: null });
    setRejectNotes('');
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Solicitud rechazada', 'success');
    await loadVerifications();
  };

  const handlePreview = async (documentPath) => {
    const { data, error } = await adminService.getVerificationDocumentUrl(documentPath);
    if (error || !data?.signedUrl) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo abrir el documento'), 'error');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredVerifications = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return verifications.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesQuery =
        !normalized ||
        [
          item.company_profiles?.company_name,
          item.document_name,
          item.status,
          item.review_notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, verifications]);

  const columns = useMemo(
    () => [
      {
        key: 'company',
        label: 'Empresa',
        render: (row) => row.company_profiles?.company_name ?? 'Empresa',
      },
      {
        key: 'created_at',
        label: 'Fecha',
        render: (row) => formatDate(row.created_at ?? row.submitted_at),
      },
      {
        key: 'document',
        label: 'Documento',
        render: (row) => row.document_name || 'Documento adjunto',
      },
      {
        key: 'review_notes',
        label: 'Notas',
        render: (row) => (
          <span className="block max-w-xs truncate text-gray-600">
            {row.review_notes || '—'}
          </span>
        ),
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
            <Button size="sm" variant="secondary" onClick={() => handlePreview(row.verification_document_path)}>
              Ver documento
            </Button>
            {row.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  loading={reviewingId === row.id}
                  onClick={() => handleApprove(row.id)}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setRejectModal({ open: true, id: row.id })}
                >
                  Rechazar
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [reviewingId],
  );

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input
          label="Buscar verificaciones"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por empresa, documento o estado"
        />
        <label className="text-sm font-medium text-gray-700">
          Estado
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
        </label>
      </div>
      <AdminTable
        columns={columns}
        rows={filteredVerifications.map((item) => ({ ...item, id: item.id }))}
        loading={loading}
        emptyMessage="No hay solicitudes de verificación."
      />

      <Modal
        isOpen={rejectModal.open}
        onClose={() => {
          setRejectModal({ open: false, id: null });
          setRejectNotes('');
        }}
        title="Rechazar verificación"
      >
        <div className="space-y-4">
          <Input
            label="Notas para la empresa"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Indica qué debe corregir la empresa"
          />
          <Button
            fullWidth
            variant="danger"
            loading={reviewingId === rejectModal.id}
            disabled={!rejectNotes.trim()}
            onClick={handleReject}
          >
            Confirmar rechazo
          </Button>
        </div>
      </Modal>
    </>
  );
}
