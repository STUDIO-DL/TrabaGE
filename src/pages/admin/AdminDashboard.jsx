import { useEffect, useState } from 'react';
import Spinner from '../../components/ui/Spinner';
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
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Users}
          tone="blue"
          value={stats?.registeredUsers ?? 0}
          label="Usuarios registrados"
        />
        <AdminStatCard
          icon={Building2}
          tone="green"
          value={stats?.registeredCompanies ?? 0}
          label="Empresas (Business)"
        />
        <AdminStatCard
          icon={Landmark}
          tone="purple"
          value={stats?.registeredOrganizations ?? 0}
          label="Organizaciones"
        />
        <AdminStatCard
          icon={ShieldCheck}
          tone="blue"
          value={stats?.verifiedCompanies ?? 0}
          label="Cuentas verificadas"
        />
        <AdminStatCard
          icon={ShieldCheck}
          tone="amber"
          value={stats?.pendingVerifications ?? 0}
          label="Verificaciones pendientes"
        />
        <AdminStatCard
          icon={Newspaper}
          tone="slate"
          value={stats?.publications ?? 0}
          label="Publicaciones"
        />
        <AdminStatCard
          icon={Briefcase}
          tone="purple"
          value={stats?.activeJobs ?? 0}
          label="Ofertas activas"
        />
      </div>

      <AdminSectionCard title="Acciones rápidas">
        <AdminQuickActions />
      </AdminSectionCard>

      <AdminSectionCard title="Verificaciones recientes">
        <ul className="space-y-3">
          {recentVerifications.length === 0 ? (
            <li className="text-sm text-gray-500">Sin solicitudes recientes.</li>
          ) : (
            recentVerifications.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.company_profiles?.company_name ?? 'Empresa'}
                  </p>
                  <p className="text-gray-500">{formatDate(item.created_at)}</p>
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
