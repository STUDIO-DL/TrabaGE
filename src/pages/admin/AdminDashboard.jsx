import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Spinner from '../../components/ui/Spinner';
import {
  Briefcase,
  Building2,
  Flag,
  Newspaper,
  ShieldCheck,
  User,
  Users,
} from '../../constants/icons';
import { adminService } from '../../services/admin.service';
import { formatDate, formatRelativeTime } from '../../utils/formatDate';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [statsRes, usersRes, companiesRes, verificationsRes, reportsRes, activityRes] =
        await Promise.all([
          adminService.getDashboardStats(),
          adminService.getRecentUsers(),
          adminService.getRecentCompanies(),
          adminService.getRecentVerifications(),
          adminService.getRecentReports(),
          adminService.getRecentActivity(),
        ]);

      if (!statsRes.error) setStats(statsRes.data);
      setRecentUsers(usersRes.data ?? []);
      setRecentCompanies(companiesRes.data ?? []);
      setRecentVerifications(verificationsRes.data ?? []);
      setRecentReports(reportsRes.data ?? []);
      setRecentActivity(activityRes.data ?? []);
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
        <AdminStatCard icon={Users} tone="blue" value={stats?.totalUsers ?? 0} label="Total usuarios" />
        <AdminStatCard icon={User} tone="slate" value={stats?.totalCandidates ?? 0} label="Candidatos" />
        <AdminStatCard icon={Building2} tone="green" value={stats?.totalCompanies ?? 0} label="Organizaciones" />
        <AdminStatCard icon={ShieldCheck} tone="blue" value={stats?.totalAdmins ?? 0} label="Administradores" />
        <AdminStatCard
          icon={ShieldCheck}
          tone="amber"
          value={stats?.pendingVerifications ?? 0}
          label="Verificaciones pendientes"
        />
        <AdminStatCard icon={Briefcase} tone="purple" value={stats?.activeJobs ?? 0} label="Ofertas activas" />
        <AdminStatCard icon={Newspaper} tone="slate" value={stats?.totalPosts ?? 0} label="Publicaciones" />
        <AdminStatCard icon={Flag} tone="amber" value={stats?.pendingReports ?? 0} label="Reportes pendientes" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="Usuarios recientes">
          <ul className="space-y-3">
            {recentUsers.length === 0 ? (
              <li className="text-sm text-gray-500">Sin registros recientes.</li>
            ) : (
              recentUsers.map((user) => (
                <li key={user.user_id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.full_name || user.company_name || user.email}
                    </p>
                    <p className="text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatRelativeTime(user.created_at)}</span>
                </li>
              ))
            )}
          </ul>
        </AdminSectionCard>

        <AdminSectionCard title="Empresas recientes">
          <ul className="space-y-3">
            {recentCompanies.length === 0 ? (
              <li className="text-sm text-gray-500">Sin empresas recientes.</li>
            ) : (
              recentCompanies.map((company) => (
                <li key={company.user_id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{company.company_name}</p>
                    <p className="text-gray-500">{company.city || 'Sin ciudad'}</p>
                  </div>
                  <AdminStatusBadge
                    status={company.is_verified ? 'verified' : 'unverified'}
                    label={company.is_verified ? 'Verificada' : 'Sin verificar'}
                  />
                </li>
              ))
            )}
          </ul>
        </AdminSectionCard>

        <AdminSectionCard
          title="Solicitudes de verificación"
          action={
            <Link to="/admin/verifications" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Ver todas
            </Link>
          }
        >
          <ul className="space-y-3">
            {recentVerifications.length === 0 ? (
              <li className="text-sm text-gray-500">Sin solicitudes.</li>
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

        <AdminSectionCard
          title="Reportes recientes"
          action={
            <Link to="/admin/reports" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Ver todos
            </Link>
          }
        >
          <ul className="space-y-3">
            {recentReports.length === 0 ? (
              <li className="text-sm text-gray-500">Sin reportes.</li>
            ) : (
              recentReports.map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{report.target_type}</p>
                    <p className="text-gray-500">{report.reason_code}</p>
                  </div>
                  <AdminStatusBadge status={report.status} />
                </li>
              ))
            )}
          </ul>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Actividad reciente">
        <ul className="space-y-3">
          {recentActivity.length === 0 ? (
            <li className="text-sm text-gray-500">Sin actividad reciente.</li>
          ) : (
            recentActivity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <p className="text-gray-800">{item.label}</p>
                <span className="text-xs text-gray-400">{formatRelativeTime(item.created_at)}</span>
              </li>
            ))
          )}
        </ul>
      </AdminSectionCard>
    </div>
  );
}
