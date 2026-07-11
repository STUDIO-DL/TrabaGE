import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import AdminUserDetailModal from '../../components/admin/AdminUserDetailModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { resolveUserAvatar } from '../../utils/resolveUserAvatar';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { ROLE_LABELS, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export default function AdminUsers() {
  const { showToast } = useNotificationContext();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [query, setQuery] = useState('');

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

  const handleToggleActive = useCallback(async (user) => {
    setActionId(user.user_id);
    const nextActive = !user.is_active;
    const { error } = await adminService.setUserActive(user.user_id, user.role, nextActive);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextActive ? 'Usuario reactivado' : 'Usuario desactivado', 'success');
    await loadUsers();
  }, [loadUsers, showToast]);

  const handleRoleChange = useCallback(async (targetUser, nextRole) => {
    if (targetUser.user_id === currentUser?.id) {
      showToast('No puedes cambiar tu propio rol.', 'error');
      return;
    }

    setActionId(targetUser.user_id);
    const { error } = await adminService.setUserRole(targetUser.user_id, nextRole);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Rol actualizado', 'success');
    await loadUsers();
  }, [currentUser?.id, loadUsers, showToast]);

  const handleDelete = useCallback(async (targetUser) => {
    if (targetUser.user_id === currentUser?.id) {
      showToast('No puedes eliminar tu propia cuenta admin.', 'error');
      return;
    }

    const label = targetUser.email || targetUser.full_name || targetUser.company_name || 'este usuario';
    if (!window.confirm(`¿Eliminar permanentemente la cuenta ${label}? Esta acción no se puede deshacer.`)) return;

    setActionId(targetUser.user_id);
    const { error } = await adminService.deleteUser(targetUser.user_id);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Usuario eliminado', 'success');
    await loadUsers();
  }, [currentUser?.id, loadUsers, showToast]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter((item) =>
      [
        item.email,
        item.role,
        item.full_name,
        item.company_name,
        item.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  const columns = useMemo(
    () => [
      {
        key: 'avatar',
        label: 'Avatar',
        render: (row) => (
          <img
            src={resolveUserAvatar(row.avatar_path || row.logo_path || row.avatar_url || row.logo_url)}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ),
      },
      {
        key: 'name',
        label: 'Nombre',
        render: (row) => row.full_name || row.company_name || '—',
      },
      { key: 'email', label: 'Email' },
      {
        key: 'role',
        label: 'Rol',
        render: (row) => (
          <select
            value={row.role}
            disabled={actionId === row.user_id || row.user_id === currentUser?.id}
            onChange={(event) => handleRoleChange(row, event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          >
            {[ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION, ROLES.ADMIN].map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        ),
      },
      { key: 'city', label: 'Ciudad', render: (row) => row.city || '—' },
      {
        key: 'created_at',
        label: 'Registrado',
        render: (row) => formatDate(row.created_at),
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
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSelectedUser(row)}>
              Ver
            </Button>
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'primary'}
              loading={actionId === row.user_id}
              disabled={row.role === ROLES.ADMIN}
              onClick={() => handleToggleActive(row)}
            >
              {row.is_active ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.user_id}
              disabled={row.user_id === currentUser?.id}
              onClick={() => handleDelete(row)}
            >
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, currentUser?.id, handleDelete, handleRoleChange, handleToggleActive],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Gestiona candidatos y empresas. La desactivación es reversible (soft delete).
      </p>
      <Input
        label="Buscar usuarios"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por email, nombre, ciudad o rol"
      />
      <AdminTable
        columns={columns}
        rows={filteredUsers.map((user) => ({ ...user, id: user.user_id }))}
        loading={loading}
        emptyMessage="No hay usuarios registrados."
      />
      <p className="text-xs text-gray-400">
        Perfiles de empresa:{' '}
        <Link to="/admin/companies" className="text-primary-600 hover:underline">
          ir a empresas
        </Link>
      </p>
      <AdminUserDetailModal
        user={selectedUser}
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        onUpdated={loadUsers}
      />
    </div>
  );
}
