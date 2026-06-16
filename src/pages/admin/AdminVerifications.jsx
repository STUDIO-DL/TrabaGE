import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';

export default function AdminVerifications() {
  const { showToast } = useNotificationContext();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectNotes, setRejectNotes] = useState('');

  const loadVerifications = async () => {
    setLoading(true);
    const { data, error } = await adminService.getAllVerifications();
    if (error) showToast(error.message, 'error');
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
      showToast(error.message, 'error');
      return;
    }
    showToast('Empresa verificada', 'success');
    await loadVerifications();
  };

  const handleReject = async () => {
    if (!rejectModal.id) return;
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
      showToast(error.message, 'error');
      return;
    }
    showToast('Solicitud rechazada', 'success');
    await loadVerifications();
  };

  const handlePreview = async (documentPath) => {
    const { data, error } = await adminService.getVerificationDocumentUrl(documentPath);
    if (error || !data?.signedUrl) {
      showToast(error?.message || 'No se pudo abrir el documento', 'error');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

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
      <AdminTable
        columns={columns}
        rows={verifications.map((item) => ({ ...item, id: item.id }))}
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
            onClick={handleReject}
          >
            Confirmar rechazo
          </Button>
        </div>
      </Modal>
    </>
  );
}
