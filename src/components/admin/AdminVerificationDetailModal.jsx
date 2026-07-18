import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import AdminStatusBadge from './AdminStatusBadge';
import AppAvatar from '../common/AppAvatar';
import { avatarTypeFromCompanyProfile } from '../../constants/avatarDefaults';
import { formatDate } from '../../utils/formatDate';
import {
  COMPANY_DOCUMENT_TYPES,
  REPRESENTATIVE_DOCUMENT_TYPES,
} from '../../utils/companyVerification';

function documentTypeLabel(value, options) {
  return options.find((item) => item.value === value)?.label ?? value ?? '—';
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-50 py-2 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 sm:max-w-[60%] sm:text-right">{value || '—'}</span>
    </div>
  );
}

export default function AdminVerificationDetailModal({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onPreviewDocument,
  reviewing = false,
}) {
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRejectNotes('');
      setShowRejectForm(false);
    }
  }, [isOpen]);

  if (!request) return null;

  const company = request.company_profiles ?? {};
  const companyPath = request.company_document_path ?? request.verification_document_path;
  const representativePath = request.representative_document_path;

  const handleReject = () => {
    if (!rejectNotes.trim()) return;
    onReject(rejectNotes.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de verificación" size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <AppAvatar
            type={avatarTypeFromCompanyProfile(company)}
            src={company.logo_path}
            name={company.company_name}
            alt={company.company_name}
            size="lg"
            variant="rounded"
            className="h-14 w-14"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900">
              {company.company_name ?? 'Empresa'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <AdminStatusBadge status={request.status} />
              <span className="text-xs text-gray-500">
                Solicitud: {formatDate(request.created_at ?? request.submitted_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2">
          <DetailRow label="Estado de verificación" value={company.verification_status} />
          <DetailRow
            label="Documento empresa"
            value={documentTypeLabel(request.company_document_type, COMPANY_DOCUMENT_TYPES)}
          />
          <DetailRow
            label="Documento representante"
            value={documentTypeLabel(
              request.representative_document_type,
              REPRESENTATIVE_DOCUMENT_TYPES,
            )}
          />
          {(request.rejection_reason || request.review_notes) && (
            <DetailRow
              label="Motivo"
              value={request.rejection_reason || request.review_notes}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPreviewDocument(companyPath)}
            disabled={!companyPath}
          >
            Ver doc. empresa
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPreviewDocument(representativePath)}
            disabled={!representativePath}
          >
            Ver doc. representante
          </Button>
        </div>

        {request.status === 'pending' && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            {!showRejectForm ? (
              <div className="flex flex-wrap gap-2">
                <Button loading={reviewing} onClick={() => onApprove(request.id)}>
                  Aprobar ✅
                </Button>
                <Button variant="danger" onClick={() => setShowRejectForm(true)}>
                  Rechazar ❌
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Motivo del rechazo (obligatorio)"
                  value={rejectNotes}
                  onChange={(event) => setRejectNotes(event.target.value)}
                  placeholder="Indica qué debe corregir la empresa para poder reenviar"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    loading={reviewing}
                    disabled={!rejectNotes.trim()}
                    onClick={handleReject}
                  >
                    Confirmar rechazo
                  </Button>
                  <Button variant="ghost" onClick={() => setShowRejectForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
