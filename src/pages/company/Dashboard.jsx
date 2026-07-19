import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import { JobListSkeleton } from '../../components/common/Skeleton';
import CompanyDashboardShell from '../../components/company/dashboard/CompanyDashboardShell';
import DashboardStatCard from '../../components/company/dashboard/DashboardStatCard';
import DashboardRecentCandidates from '../../components/company/dashboard/DashboardRecentCandidates';
import DashboardQuickAccess from '../../components/company/dashboard/DashboardQuickAccess';
import CompanyVerificationStatus from '../../components/company/profile/CompanyVerificationStatus';
import AppAvatar from '../../components/common/AppAvatar';
import { avatarTypeFromRole } from '../../constants/avatarDefaults';
import {
  Bell,
  Briefcase,
  ChevronDown,
  FileText,
  Plus,
  Users,
  ICON_SIZES,
} from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath } from '../../constants/roles';
import { useProfile } from '../../hooks/useProfile';
import { useApplications } from '../../hooks/useApplications';
import { useNotifications } from '../../hooks/useNotifications';
import { jobsService } from '../../services/jobs.service';
import { getOrgLabels } from '../../utils/orgLabels';

function mapCandidateForDashboard(application) {
  const profile = application.candidate_profiles;
  return {
    id: application.id,
    user_id: application.candidate_id,
    full_name: profile?.full_name || application.full_name || 'Candidato',
    avatar_path: profile?.avatar_path,
    job_title: application.jobs?.title || '',
    applied_at: application.applied_at,
  };
}

export default function Dashboard() {
  const { user, isPreviewMode, role } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { applications } = useApplications();
  const { unreadCount } = useNotifications();
  const [jobs, setJobs] = useState([]);
  const base = role || ROLES.BUSINESS;

  useEffect(() => {
    if (!user?.id || isPreviewMode) {
      setJobs([]);
      return;
    }

    jobsService.getCompanyJobs(user.id).then(({ data }) => setJobs(data ?? []));
  }, [user?.id, isPreviewMode]);

  const avatarType = avatarTypeFromRole(base, { profile });

  const stats = useMemo(
    () => ({
      activeJobs: jobs.filter((job) => job.status === 'active').length,
      applications: applications.length,
      pendingReviews: applications.filter((app) => app.status === 'pending').length,
    }),
    [applications, jobs],
  );

  const recentCandidates = useMemo(
    () =>
      applications
        .slice(0, 5)
        .map(mapCandidateForDashboard)
        .filter((candidate) => candidate.user_id),
    [applications],
  );

  const orgLabels = getOrgLabels(profile);

  if (profileLoading) {
    return (
      <div className="min-h-dvh bg-app-surface p-space-base" aria-busy="true" aria-label="Cargando panel">
        <JobListSkeleton count={4} />
      </div>
    );
  }

  return (
    <CompanyDashboardShell profile={profile}>
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">{orgLabels.welcome}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={rolePath(base, '/notifications')}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm"
              aria-label="Notificaciones"
            >
              <AppIcon icon={Bell} size={ICON_SIZES.default} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <Link
              to={rolePath(base, '/profile')}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-sm"
              aria-label={orgLabels.profile}
            >
              <AppAvatar
                type={avatarType}
                src={profile?.logo_path}
                name={profile?.company_name}
                alt={profile?.company_name}
                size="sm"
                variant="rounded"
                className="h-8 w-8"
              />
              <AppIcon icon={ChevronDown} size={ICON_SIZES.sm} className="text-gray-400" />
            </Link>

            <Link to={rolePath(base, '/jobs/create')} className="hidden sm:block">
              <Button className="inline-flex items-center gap-2 rounded-xl px-4">
                <AppIcon icon={Plus} size={ICON_SIZES.sm} className="text-white" />
                {orgLabels.createOffer}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            icon={Briefcase}
            tone="blue"
            value={stats.activeJobs}
            label="Ofertas activas"
            linkLabel="Ver ofertas"
            to={rolePath(base, '/jobs')}
          />
          <DashboardStatCard
            icon={Users}
            tone="green"
            value={stats.applications}
            label="Postulaciones recibidas"
            linkLabel="Ver postulaciones"
            to={rolePath(base, '/applicants')}
          />
          <DashboardStatCard
            icon={FileText}
            tone="purple"
            value={stats.pendingReviews}
            label="Revisiones pendientes"
            linkLabel="Revisar"
            to={rolePath(base, '/applicants')}
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Estado de verificación</p>
            <div className="mt-4">
              <CompanyVerificationStatus company={profile} profile />
            </div>
            <Link
              to={rolePath(base, '/verification')}
              className="mt-4 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Gestionar verificación
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <DashboardRecentCandidates candidates={recentCandidates} />
          </div>
          <div className="xl:col-span-2">
            <DashboardQuickAccess />
          </div>
        </div>

        <div className="mt-4 sm:hidden">
          <Link to={rolePath(base, '/jobs/create')}>
            <Button fullWidth className="inline-flex items-center justify-center gap-2 rounded-xl">
              <AppIcon icon={Plus} size={ICON_SIZES.sm} className="text-white" />
              Crear oferta
            </Button>
          </Link>
        </div>
      </div>
    </CompanyDashboardShell>
  );
}
