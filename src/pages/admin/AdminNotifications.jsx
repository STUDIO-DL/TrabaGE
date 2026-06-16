import { useEffect, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import Spinner from '../../components/ui/Spinner';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatRelativeTime } from '../../utils/formatDate';

export default function AdminNotifications() {
  const { showToast } = useNotificationContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await adminService.getAdminNotifications();
      if (error) showToast(error.message, 'error');
      setItems(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AdminSectionCard title="Actividad de la plataforma">
      <ul className="divide-y divide-gray-100">
        {items.length === 0 ? (
          <li className="py-6 text-center text-sm text-gray-500">Sin notificaciones.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{item.body}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(item.created_at)}</span>
            </li>
          ))
        )}
      </ul>
    </AdminSectionCard>
  );
}
