import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { resolveUserAvatar } from '../../utils/resolveUserAvatar';
import { formatDate } from '../../utils/formatDate';

export default function AdminUsers() {
  const { showToast } = useNotificationContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await adminService.getUsers();
    if (error) showToast(error.message, 'error');
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleActive = async (user) => {
    setActionId(user.user_id);
    const nextActive = !user.is_active;
    const { error } = await adminService.setUserActive(user.user_id, user.role, nextActive);
    setActionId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(nextActive ? 'Usuario reactivado' : 'Usuario desactivado', 'success');
    await loadUsers();
  };

  const columns = useMemo(
    () => [
      {
        key: 'avatar',
        label: 'Avatar',
        render: (row) => (
          <img
            src={resolveUserAvatar(row.avatar_path)}
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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const path =
                  row.role === 'company'
                    ? `/companies/${row.user_id}`
                    : `/profile/${row.user_id}`;
                navigate(path);
              }}
            >
              Ver
            </Button>
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'primary'}
              loading={actionId === row.user_id}
              onClick={() => handleToggleActive(row)}
            >
              {row.is_active ? 'Desactivar' : 'Reactivar'}
            </Button>
          </div>
        ),
      },
    ],
    [actionId],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Gestiona candidatos y empresas. La desactivación es reversible (soft delete).
      </p>
      <AdminTable
        columns={columns}
        rows={users.map((user) => ({ ...user, id: user.user_id }))}
        loading={loading}
        emptyMessage="No hay usuarios registrados."
      />
      <p className="text-xs text-gray-400">
        Perfiles de empresa:{' '}
        <Link to="/admin/companies" className="text-primary-600 hover:underline">
          ir a empresas
        </Link>
      </p>
    </div>
  );
}
