import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import AdminConfirmModal from '../../components/admin/AdminConfirmModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import AppAvatar from '../../components/common/AppAvatar';
import AppIcon from '../../components/common/AppIcon';
import {
  AvatarType,
  avatarTypeFromRole,
} from '../../constants/avatarDefaults';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { ROLE_LABELS, isEmployerRole } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import useAdminTable from '../../hooks/useAdminTable';
import { Eye, Trash2, ICON_SIZES } from '../../constants/icons';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { showToast } = useNotificationContext();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getUsers();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setUsers(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const tableFilters = useMemo(() => {
    const filters = {};
    if (roleFilter !== 'all') filters.role = roleFilter;
    if (statusFilter === 'active') filters.is_active = true;
    if (statusFilter === 'inactive') filters.is_active = false;
    return filters;
  }, [roleFilter, statusFilter]);

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
  } = useAdminTable(users, {
    searchQuery: query,
    searchKeys: ['email', 'role', 'full_name', 'company_name', 'city'],
    filters: tableFilters,
    defaultSortKey: 'created_at',
    defaultSortDir: 'desc',
  });

  const openProfile = useCallback((user) => {
    const path = isEmployerRole(user.role)
      ? `/companies/${user.user_id}`
      : `/profile/${user.user_id}`;
    navigate(path);
  }, [navigate]);

  const handleToggleActive = useCallback(async (targetUser) => {
    setActionId(targetUser.user_id);
    const nextActive = !targetUser.is_active;
    const { error } = await adminService.setUserActive(targetUser.user_id, targetUser.role, nextActive);
    setActionId(null);
    setConfirmAction(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextActive ? 'Usuario reactivado' : 'Usuario desactivado', 'success');
    await loadUsers();
  }, [loadUsers, showToast]);

  const handleDelete = useCallback(async (targetUser) => {
    setActionId(targetUser.user_id);
    const { error } = await adminService.deleteUser(targetUser.user_id);
    setActionId(null);
    setConfirmAction(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Usuario eliminado', 'success');
    await loadUsers();
  }, [loadUsers, showToast]);

  const handleConfirm = async () => {
    if (!confirmAction?.user) return;
    if (confirmAction.type === 'delete') {
      await handleDelete(confirmAction.user);
    } else {
      await handleToggleActive(confirmAction.user);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'avatar',
        label: 'Avatar',
        render: (row) => {
          const isCompany = isEmployerRole(row.role);
          const avatarType = isCompany
            ? avatarTypeFromRole(row.role, { companyType: row.company_type })
            : AvatarType.PERSONAL;

          return (
            <AppAvatar
              type={avatarType}
              src={isCompany ? row.logo_path : row.avatar_path}
              name={row.full_name || row.company_name}
              alt={row.full_name || row.company_name}
              size="sm"
              variant={isCompany ? 'rounded' : 'circular'}
              className="h-9 w-9"
            />
          );
        },
      },
      {
        key: 'name',
        label: 'Nombre',
        sortable: true,
        sortKey: 'full_name',
        render: (row) => row.full_name || row.company_name || '—',
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        sortKey: 'email',
      },
      {
        key: 'role',
        label: 'Tipo de cuenta',
        sortable: true,
        sortKey: 'role',
        render: (row) => ROLE_LABELS[row.role] ?? row.role,
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
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'primary'}
              loading={actionId === row.user_id}
              onClick={() =>
                setConfirmAction({
                  type: row.is_active ? 'deactivate' : 'activate',
                  user: row,
                  title: row.is_active ? 'Desactivar usuario' : 'Reactivar usuario',
                  description: row.is_active
                    ? `¿Desactivar la cuenta de ${row.email}? No podrá iniciar sesión ni aparecer públicamente.`
                    : `¿Reactivar la cuenta de ${row.email}?`,
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
              disabled={row.user_id === currentUser?.id}
              onClick={() =>
                setConfirmAction({
                  type: 'delete',
                  user: row,
                  title: 'Eliminar usuario',
                  description: `¿Eliminar permanentemente la cuenta ${row.email}? Se borrarán auth, perfil y datos asociados.`,
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
    [actionId, currentUser?.id, openProfile],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Gestiona cuentas de candidatos y empleadores. La desactivación preserva los datos.
      </p>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <Input
          label="Buscar usuarios"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Email, nombre, ciudad..."
        />
        <label className="text-sm font-medium text-gray-700">
          Tipo
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              resetPage();
            }}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
          >
            <option value="all">Todos</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="organization">Organización</option>
          </select>
        </label>
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
      </div>

      <AdminTable
        columns={columns}
        rows={rows.map((user) => ({ ...user, id: user.user_id }))}
        loading={loading}
        emptyMessage="No hay usuarios registrados."
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
