import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import CompanyDashboardShell from '../../components/company/dashboard/CompanyDashboardShell';
import DashboardHero from '../../components/company/dashboard/DashboardHero';
import DashboardVerificationBanner from '../../components/company/dashboard/DashboardVerificationBanner';
import DashboardStatCard from '../../components/company/dashboard/DashboardStatCard';
import DashboardJobsList from '../../components/company/dashboard/DashboardJobsList';
import DashboardRecentCandidates from '../../components/company/dashboard/DashboardRecentCandidates';
import DashboardQuickAccess from '../../components/company/dashboard/DashboardQuickAccess';
import DashboardActivityFeed from '../../components/company/dashboard/DashboardActivityFeed';
import DashboardAnalyticsChart from '../../components/company/dashboard/DashboardAnalyticsChart';
import DashboardPageSkeleton from '../../components/company/dashboard/DashboardPageSkeleton';
import {
  Eye,
  FileText,
  Heart,
  Users,
} from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath } from '../../constants/roles';
import { useProfile } from '../../hooks/useProfile';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationContext } from '../../context/NotificationContext';
import { useCompanyDashboardSummary } from '../../features/company-dashboard/useCompanyDashboardSummary';
import { jobsService } from '../../services/jobs.service';
import { getOrgLabels } from '../../utils/orgLabels';
import { getUserErrorMessage, ERROR_ACTION } from '../../utils/userFacingError';
import { exitGuestToAuth } from '../../utils/guestMode';

export default function Dashboard() {
  const { user, isPreviewMode, role } = useAuth();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { unreadCount } = useNotifications();
  const { showToast } = useNotificationContext();
  const base = role || ROLES.BUSINESS;
  const orgLabels = getOrgLabels(profile);
  const [closingId, setClosingId] = useState(null);

  const { data, loading, error, reload } = useCompanyDashboardSummary({
    userId: user?.id,
    role,
    isPreviewMode,
    profile,
  });

  const companyProfile = useMemo(
    () => ({
      ...profile,
      ...(data?.company || {}),
      company_name: profile?.company_name || data?.company?.company_name,
      logo_path: profile?.logo_path || data?.company?.logo_path,
      sector: profile?.sector || data?.company?.sector,
      city: profile?.city || data?.company?.city,
      is_verified: profile?.is_verified ?? data?.company?.is_verified,
      verification_status: profile?.verification_status ?? data?.company?.verification_status,
    }),
    [profile, data?.company],
  );

  const stats = data?.stats ?? {};
  const jobs = data?.jobs ?? [];
  const applicants = data?.applicants ?? [];
  const activity = data?.activity ?? [];
  const chart = data?.chart_30d ?? [];
  const notifBadge = Math.max(
    Number(unreadCount || 0),
    Number(stats.unread_notifications || 0),
  );

  const goAuth = () => exitGuestToAuth(navigate);

  const handleCloseJob = async (job) => {
    if (isPreviewMode) {
      goAuth();
      return;
    }
    if (!job?.id) return;
    setClosingId(job.id);
    const { error: closeError } = await jobsService.updateJobStatus(job.id, 'closed');
    setClosingId(null);
    if (closeError) {
      showToast(getUserErrorMessage(closeError, ERROR_ACTION.save), 'error');
      return;
    }
    showToast('Oferta cerrada', 'success');
    reload();
  };

  if (profileLoading || (loading && !data && !error)) {
    return (
      <CompanyDashboardShell profile={profile}>
        <div className="px-4 py-6 lg:px-8 lg:py-8">
          <DashboardPageSkeleton />
        </div>
      </CompanyDashboardShell>
    );
  }

  if (error && !data) {
    return (
      <CompanyDashboardShell profile={profile}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12 text-center">
          <p className="text-base font-semibold text-app-text">
            No hemos podido cargar esta información.
          </p>
          <p className="mt-2 max-w-sm text-sm text-app-muted">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button type="button" variant="secondary" className="mt-5" onClick={reload}>
            Reintentar
          </Button>
        </div>
      </CompanyDashboardShell>
    );
  }

  return (
    <CompanyDashboardShell profile={companyProfile}>
      <div className="space-y-5 px-4 py-6 lg:px-8 lg:py-8">
        <DashboardHero
          profile={companyProfile}
          stats={stats}
          unreadCount={notifBadge}
          createLabel={orgLabels.createOffer || 'Crear oferta'}
        />

        <DashboardVerificationBanner profile={companyProfile} />

        {isPreviewMode ? (
          <p className="text-caption font-medium text-app-subtle">Ejemplo de analíticas</p>
        ) : null}

        <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-4 lg:gap-space-md">
          <DashboardStatCard
            icon={FileText}
            value={isPreviewMode ? null : stats.applications_total}
            label="Candidaturas"
            deltaPct={isPreviewMode ? null : stats.applications_delta_pct}
            hint={isPreviewMode ? 'Sin actividad todavía' : null}
            linkLabel="Ver"
            to={isPreviewMode ? undefined : rolePath(base, '/applicants')}
            onLinkClick={isPreviewMode ? goAuth : undefined}
          />
          <DashboardStatCard
            icon={Eye}
            value={isPreviewMode ? null : stats.views_total}
            label="Visualizaciones"
            deltaPct={isPreviewMode ? null : stats.views_delta_pct}
            hint={isPreviewMode ? 'Sin actividad todavía' : null}
            linkLabel="Analíticas"
            to={isPreviewMode ? undefined : rolePath(base, '/analytics')}
            onLinkClick={isPreviewMode ? goAuth : undefined}
          />
          <DashboardStatCard
            icon={Users}
            value={isPreviewMode ? null : stats.followers_total}
            label="Seguidores"
            deltaPct={isPreviewMode ? null : stats.followers_delta_pct}
            hint={isPreviewMode ? 'Sin actividad todavía' : null}
          />
          <DashboardStatCard
            icon={Heart}
            value={isPreviewMode ? null : stats.interactions_total}
            label="Interacciones"
            deltaPct={isPreviewMode ? null : stats.interactions_delta_pct}
            hint={isPreviewMode ? 'Sin actividad todavía' : null}
            linkLabel="Feed"
            to={isPreviewMode ? undefined : rolePath(base, '/feed')}
            onLinkClick={isPreviewMode ? goAuth : undefined}
          />
        </div>

        <DashboardQuickAccess />

        <div className="grid gap-5 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <DashboardJobsList
              jobs={jobs}
              onCloseJob={handleCloseJob}
              closingId={closingId}
            />
          </div>
          <div className="xl:col-span-2">
            <DashboardActivityFeed items={activity} />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <DashboardRecentCandidates candidates={applicants} />
          </div>
          <div className="xl:col-span-2">
            <DashboardAnalyticsChart data={chart} />
          </div>
        </div>
      </div>
    </CompanyDashboardShell>
  );
}
