import { useEffect, useState } from 'react';
import Spinner from '../../components/ui/Spinner';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import { adminService } from '../../services/admin.service';
import { ROLE_LABELS, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { useNotificationContext } from '../../context/NotificationContext';

function ProfileField({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '—'}</p>
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
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-gray-500">
        Perfil interno de administración. Solo visible para otros administradores.
      </p>

      <AdminSectionCard title="Mi perfil admin">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileField label="Nombre" value={displayName} />
          <ProfileField label="Rol" value={ROLE_LABELS[ROLES.ADMIN]} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Equipo de administración">
        <ul className="divide-y divide-gray-100">
          {admins.length === 0 ? (
            <li className="py-4 text-sm text-gray-500">No hay administradores registrados.</li>
          ) : (
            admins.map((admin) => (
              <li key={admin.user_id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{admin.full_name}</p>
                  <p className="text-gray-500">{admin.email}</p>
                </div>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
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
