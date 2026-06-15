import { useEffect, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatRelativeTime } from '../../utils/formatDate';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { showToast } = useNotificationContext();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectNotes, setRejectNotes] = useState('');

  const loadVerifications = async () => {
    setLoading(true);
    const { data, error } = await adminService.getPendingVerifications();
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

  return (
    <PageContainer title="Admin" bottomNav={false}>
      <div className="space-y-4 p-4">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Verificaciones</h2>
          {loading ? (
            <Spinner fullscreen />
          ) : verifications.length === 0 ? (
            <p className="text-sm text-gray-500">No hay verificaciones pendientes.</p>
          ) : (
            verifications.map((item) => (
              <Card key={item.id} className="mb-3">
                <p className="font-semibold text-gray-900">
                  {item.company_profiles?.company_name ?? 'Empresa'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Enviada {formatRelativeTime(item.created_at ?? item.submitted_at)}
                </p>
                {item.document_name && (
                  <p className="mt-1 text-sm text-gray-600">{item.document_name}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePreview(item.document_url)}
                  >
                    Ver documento
                  </Button>
                  <Button
                    size="sm"
                    loading={reviewingId === item.id}
                    onClick={() => handleApprove(item.id)}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRejectModal({ open: true, id: item.id })}
                  >
                    Rechazar
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>

        <Button variant="danger" fullWidth onClick={logout}>
          Cerrar sesión
        </Button>
      </div>

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
    </PageContainer>
  );
}
