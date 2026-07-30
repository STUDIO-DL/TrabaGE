import { useEffect, useState } from 'react';
import { AdminDashboardSkeleton } from '../../components/common/Skeleton';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import AdminQuickActions from '../../components/admin/AdminQuickActions';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import {
  Briefcase,
  Building2,
  Landmark,
  Newspaper,
  ShieldCheck,
  Users,
} from '../../constants/icons';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [statsRes, verificationsRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getRecentVerifications(5),
      ]);

      if (!statsRes.error) setStats(statsRes.data);
      setRecentVerifications(verificationsRes.data ?? []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-space-lg">
      <div className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={Users} value={stats?.registeredUsers ?? 0} label="Usuarios" />
        <AdminStatCard
          icon={Building2}
          value={stats?.registeredCompanies ?? 0}
          label="Empresas"
        />
        <AdminStatCard
          icon={Landmark}
          value={stats?.registeredOrganizations ?? 0}
          label="Organizaciones"
        />
        <AdminStatCard
          icon={ShieldCheck}
          value={stats?.verifiedCompanies ?? 0}
          label="Verificadas"
        />
        <AdminStatCard
          icon={ShieldCheck}
          value={stats?.pendingVerifications ?? 0}
          label="Pendientes"
        />
        <AdminStatCard
          icon={Newspaper}
          value={stats?.publications ?? 0}
          label="Publicaciones"
        />
        <AdminStatCard icon={Briefcase} value={stats?.activeJobs ?? 0} label="Ofertas activas" />
      </div>

      <AdminQuickActions />

      <AdminSectionCard title="Verificaciones recientes">
        <ul className="divide-y divide-app-divider">
          {recentVerifications.length === 0 ? (
            <li className="py-space-sm text-body-small text-app-muted">Sin solicitudes recientes.</li>
          ) : (
            recentVerifications.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-space-md py-space-sm text-body-small"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-app-text">
                    {item.company_profiles?.company_name ?? 'Empresa'}
                  </p>
                  <p className="text-caption text-app-subtle">{formatDate(item.created_at)}</p>
                </div>
                <AdminStatusBadge status={item.status} />
              </li>
            ))
          )}
        </ul>
      </AdminSectionCard>
    </div>
  );
}
