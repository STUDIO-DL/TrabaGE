import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import AdminVerificationDetailModal from '../../components/admin/AdminVerificationDetailModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppAvatar from '../../components/common/AppAvatar';
import { avatarTypeFromCompanyProfile } from '../../constants/avatarDefaults';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import useAdminTable from '../../hooks/useAdminTable';
import {
  COMPANY_DOCUMENT_TYPES,
  REPRESENTATIVE_DOCUMENT_TYPES,
} from '../../utils/companyVerification';

function documentTypeLabel(value, options) {
  return options.find((item) => item.value === value)?.label ?? value ?? '—';
}

export default function AdminVerifications() {
  const { showToast } = useNotificationContext();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getAllVerifications();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setVerifications(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  const tableFilters = useMemo(() => {
    if (statusFilter === 'all') return {};
    return { status: statusFilter };
  }, [statusFilter]);

  const {
    rows,
    totalRows,
    page,
    setPage,
    totalPages,
    pageSize,
    sortKey,
    sortDir,
    toggleSort,
    resetPage,
  } = useAdminTable(verifications, {
    searchQuery: query,
    searchKeys: [
      'company_profiles.company_name',
      'company_document_type',
      'representative_document_type',
      'status',
      'rejection_reason',
    ],
    filters: tableFilters,
    defaultSortKey: 'created_at',
    defaultSortDir: 'desc',
  });

  const handleApprove = useCallback(async (id) => {
    setReviewingId(id);
    const { error } = await adminService.reviewVerification(id, 'approved', null);
    setReviewingId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Empresa verificada', 'success');
    setSelectedRequest(null);
    await loadVerifications();
  }, [loadVerifications, showToast]);

  const handleReject = useCallback(async (id, notes) => {
    setReviewingId(id);
    const { error } = await adminService.reviewVerification(id, 'rejected', notes);
    setReviewingId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Solicitud rechazada', 'success');
    setSelectedRequest(null);
    await loadVerifications();
  }, [loadVerifications, showToast]);

  const handlePreview = useCallback(async (documentPath) => {
    if (!documentPath) {
      showToast('Documento no disponible', 'error');
      return;
    }
    const { data, error } = await adminService.getVerificationDocumentUrl(documentPath);
    if (error || !data?.signedUrl) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo abrir el documento'), 'error');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }, [showToast]);

  const columns = useMemo(
    () => [
      {
        key: 'logo',
        label: 'Logo',
        render: (row) => (
          <AppAvatar
            type={avatarTypeFromCompanyProfile(row.company_profiles ?? {})}
            src={row.company_profiles?.logo_path}
            name={row.company_profiles?.company_name}
            alt={row.company_profiles?.company_name}
            size="sm"
            variant="rounded"
            className="h-9 w-9"
          />
        ),
      },
      {
        key: 'company',
        label: 'Empresa',
        sortable: true,
        sortKey: 'company_profiles.company_name',
        render: (row) => row.company_profiles?.company_name ?? 'Empresa',
      },
      {
        key: 'created_at',
        label: 'Fecha',
        sortable: true,
        sortKey: 'created_at',
        render: (row) => formatDate(row.created_at ?? row.submitted_at),
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        sortKey: 'status',
        render: (row) => <AdminStatusBadge status={row.status} />,
      },
      {
        key: 'company_document',
        label: 'Doc. enviado',
        render: (row) =>
          documentTypeLabel(row.company_document_type, COMPANY_DOCUMENT_TYPES),
      },
      {
        key: 'representative_document',
        label: 'Representante',
        render: (row) =>
          documentTypeLabel(row.representative_document_type, REPRESENTATIVE_DOCUMENT_TYPES),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <Button size="sm" variant="secondary" onClick={() => setSelectedRequest(row)}>
            Ver detalle
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input
          label="Buscar verificaciones"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Empresa, documento o estado"
        />
        <label className="text-sm font-medium text-gray-700">
          Estado
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              resetPage();
            }}
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
        rows={rows.map((item) => ({ ...item, id: item.id }))}
        loading={loading}
        emptyMessage="No hay solicitudes de verificación."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        page={page}
        totalPages={totalPages}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <AdminVerificationDetailModal
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleApprove}
        onReject={(notes) => selectedRequest && handleReject(selectedRequest.id, notes)}
        onPreviewDocument={handlePreview}
        reviewing={reviewingId === selectedRequest?.id}
      />
    </>
  );
}
