import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminTable from './AdminTable';
import AdminStatusBadge from './AdminStatusBadge';
import AdminConfirmModal from './AdminConfirmModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import AppAvatar from '../common/AppAvatar';
import { avatarTypeFromCompanyProfile } from '../../constants/avatarDefaults';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import useAdminTable from '../../hooks/useAdminTable';
import AppIcon from '../common/AppIcon';
import { Eye, ShieldCheck, Trash2, ICON_SIZES } from '../../constants/icons';

export default function AdminEmployerList({ accountRole, title, description }) {
  const navigate = useNavigate();
  const { showToast } = useNotificationContext();
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  const loadEmployers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getEmployers(accountRole);
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setEmployers(data ?? []);
    setLoading(false);
  }, [accountRole, showToast]);

  useEffect(() => {
    loadEmployers();
  }, [loadEmployers]);

  const tableFilters = useMemo(() => {
    const filters = {};
    if (statusFilter === 'active') filters.is_active = true;
    if (statusFilter === 'inactive') filters.is_active = false;
    return filters;
  }, [statusFilter]);

  const preFiltered = useMemo(() => {
    if (verifiedFilter === 'all') return employers;
    if (verifiedFilter === 'verified') {
      return employers.filter((item) => item.is_verified);
    }
    return employers.filter((item) => !item.is_verified);
  }, [employers, verifiedFilter]);

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
  } = useAdminTable(preFiltered, {
    searchQuery: query,
    searchKeys: ['company_name', 'city', 'sector', 'company_type'],
    filters: tableFilters,
    defaultSortKey: 'created_at',
    defaultSortDir: 'desc',
  });

  const handleToggleActive = useCallback(async (employer) => {
    setActionId(employer.user_id);
    const nextActive = !employer.is_active;
    const { error } = await adminService.setCompanyActive(employer.user_id, nextActive);
    setActionId(null);
    setConfirmAction(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextActive ? 'Cuenta reactivada' : 'Cuenta desactivada', 'success');
    await loadEmployers();
  }, [loadEmployers, showToast]);

  const handleManualVerify = useCallback(async (employer) => {
    setActionId(employer.user_id);
    const { error } = await adminService.manualVerifyCompany(employer.user_id);
    setActionId(null);
    setConfirmAction(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Cuenta verificada manualmente', 'success');
    await loadEmployers();
  }, [loadEmployers, showToast]);

  const handleDelete = useCallback(async (employer) => {
    setActionId(employer.user_id);
    const { error } = await adminService.deleteUser(employer.user_id);
    setActionId(null);
    setConfirmAction(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Cuenta eliminada', 'success');
    await loadEmployers();
  }, [loadEmployers, showToast]);

  const openProfile = useCallback((employer) => {
    navigate(`/companies/${employer.user_id}`);
  }, [navigate]);

  const columns = useMemo(
    () => [
      {
        key: 'logo',
        label: 'Logo',
        render: (row) => (
          <AppAvatar
            type={avatarTypeFromCompanyProfile(row)}
            src={row.logo_path}
            name={row.company_name}
            alt={row.company_name}
            size="sm"
            variant="rounded"
            className="h-9 w-9"
          />
        ),
      },
      {
        key: 'company_name',
        label: 'Nombre',
        sortable: true,
        sortKey: 'company_name',
      },
      {
        key: 'sector',
        label: 'Sector',
        sortable: true,
        sortKey: 'sector',
        render: (row) => row.sector || '—',
      },
      {
        key: 'city',
        label: 'Ciudad',
        sortable: true,
        sortKey: 'city',
        render: (row) => row.city || '—',
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <AdminStatusBadge
            status={row.is_active ? 'active' : 'inactive'}
            label={row.is_active ? 'Activo' : 'Inactivo'}
          />
        ),
      },
      {
        key: 'verified',
        label: 'Verificada',
        sortable: true,
        sortKey: 'is_verified',
        render: (row) => (
          <AdminStatusBadge
            status={row.is_verified ? 'verified' : 'unverified'}
            label={row.is_verified ? 'Sí' : 'No'}
          />
        ),
      },
      {
        key: 'created_at',
        label: 'Registro',
        sortable: true,
        sortKey: 'created_at',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => openProfile(row)} title="Ver perfil">
              <AppIcon icon={Eye} size={ICON_SIZES.sm} />
            </Button>
            {!row.is_verified && (
              <Button
                size="sm"
                variant="secondary"
                loading={actionId === row.user_id}
                onClick={() =>
                  setConfirmAction({
                    type: 'verify',
                    employer: row,
                    title: 'Verificar manualmente',
                    description: `¿Verificar "${row.company_name}" sin solicitud previa? Se mostrará la insignia azul de verificación.`,
                    confirmLabel: 'Verificar',
                    variant: 'primary',
                  })
                }
                title="Verificar manualmente"
              >
                <AppIcon icon={ShieldCheck} size={ICON_SIZES.sm} />
              </Button>
            )}
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'primary'}
              loading={actionId === row.user_id}
              onClick={() =>
                setConfirmAction({
                  type: row.is_active ? 'deactivate' : 'activate',
                  employer: row,
                  title: row.is_active ? 'Desactivar cuenta' : 'Reactivar cuenta',
                  description: row.is_active
                    ? `¿Desactivar "${row.company_name}"? No podrá iniciar sesión ni aparecer públicamente.`
                    : `¿Reactivar "${row.company_name}"?`,
                  confirmLabel: row.is_active ? 'Desactivar' : 'Reactivar',
                  variant: row.is_active ? 'danger' : 'primary',
                })
              }
            >
              {row.is_active ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.user_id}
              onClick={() =>
                setConfirmAction({
                  type: 'delete',
                  employer: row,
                  title: 'Eliminar cuenta',
                  description: `¿Eliminar permanentemente "${row.company_name}"? Se borrarán auth, perfil y datos asociados. Esta acción no se puede deshacer.`,
                  confirmLabel: 'Eliminar',
                  variant: 'danger',
                })
              }
              title="Eliminar"
            >
              <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
            </Button>
          </div>
        ),
      },
    ],
    [actionId, openProfile],
  );

  const handleConfirm = async () => {
    if (!confirmAction?.employer) return;
    const { type, employer } = confirmAction;

    if (type === 'verify') await handleManualVerify(employer);
    else if (type === 'delete') await handleDelete(employer);
    else await handleToggleActive(employer);
  };

  return (
    <div className="space-y-4">
      {description && <p className="text-sm text-gray-500">{description}</p>}

      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <Input
          label={`Buscar ${title.toLowerCase()}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Nombre, ciudad, sector..."
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
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Verificación
          <select
            value={verifiedFilter}
            onChange={(event) => {
              setVerifiedFilter(event.target.value);
              resetPage();
            }}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
          >
            <option value="all">Todas</option>
            <option value="verified">Verificadas</option>
            <option value="unverified">Sin verificar</option>
          </select>
        </label>
      </div>

      <AdminTable
        columns={columns}
        rows={rows.map((item) => ({ ...item, id: item.user_id }))}
        loading={loading}
        emptyMessage={`No hay ${title.toLowerCase()} registradas.`}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        page={page}
        totalPages={totalPages}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <AdminConfirmModal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        loading={Boolean(actionId)}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant ?? 'danger'}
      />
    </div>
  );
}
