import { useEffect, useState } from 'react';
import { AdminProfileSkeleton } from '../../components/common/Skeleton';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { adminService } from '../../services/admin.service';
import { ROLE_LABELS, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { useNotificationContext } from '../../context/NotificationContext';

function ProfileField({ label, value }) {
  return (
    <div className="surface-inset px-space-md py-space-sm">
      <p className="text-caption font-medium uppercase tracking-wide text-app-subtle">{label}</p>
      <p className="mt-space-xs text-body-small font-medium text-app-text">{value || '—'}</p>
    </div>
  );
}

export default function AdminProfile() {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await adminService.getAdmins();
      if (error) showToast(getSupabaseErrorMessage(error), 'error');
      setAdmins(data ?? []);
      setLoading(false);
    };
    load();
  }, [showToast]);

  const currentAdmin = admins.find((admin) => admin.user_id === user?.id);
  const displayName =
    currentAdmin?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Administrador';

  if (loading) {
    return <AdminProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-space-lg">
      <p className="text-body-small text-app-muted">
        Perfil interno de administración. Solo visible para otros administradores.
      </p>

      <AdminSectionCard title="Mi perfil admin">
        <div className="grid gap-space-sm sm:grid-cols-2">
          <ProfileField label="Nombre" value={displayName} />
          <ProfileField label="Rol" value={ROLE_LABELS[ROLES.ADMIN]} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Equipo de administración">
        <ul className="divide-y divide-app-divider">
          {admins.length === 0 ? (
            <li className="py-space-md text-body-small text-app-muted">
              No hay administradores registrados.
            </li>
          ) : (
            admins.map((admin) => (
              <li
                key={admin.user_id}
                className="flex items-center justify-between py-space-sm text-body-small"
              >
                <div>
                  <p className="font-medium text-app-text">{admin.full_name}</p>
                  <p className="text-app-muted">{admin.email}</p>
                </div>
                <span className="rounded-radius-sm bg-primary-50 px-space-sm py-0.5 text-caption font-medium text-primary-700">
                  {ROLE_LABELS[ROLES.ADMIN]}
                </span>
              </li>
            ))
          )}
        </ul>
      </AdminSectionCard>
    </div>
  );
}
