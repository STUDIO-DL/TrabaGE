import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Briefcase,
  ChartColumn,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Repeat2,
  Share2,
  Users,
  X,
  ICON_SIZES,
} from '../../constants/icons';
import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import CompanyDashboardShell from '../../components/company/dashboard/CompanyDashboardShell';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES, rolePath } from '../../constants/roles';
import { getOrgLabels } from '../../utils/orgLabels';
import { JobListSkeleton } from '../../components/common/Skeleton';
import { useCompanyAnalyticsBundle } from '../../features/company-analytics/useCompanyAnalyticsBundle';
import {
  COMPANY_ANALYTICS_PERIODS,
  EMPTY_ANALYTICS_MESSAGE,
  formatDaysActive,
  formatGrowthPct,
  jobStatusLabel,
} from '../../features/company-analytics/companyAnalyticsPeriods';
import {
  CompanyAnalyticsCharts,
  CompanyAnalyticsEmpty,
  CompanyAnalyticsSkeleton,
  MetricCard,
  SectionCard,
} from '../../features/company-analytics/CompanyAnalyticsUi';
import {
  exportCompanyAnalyticsCsv,
  exportCompanyAnalyticsPdf,
} from '../../features/company-analytics/exportCompanyAnalytics';
import { useNotificationContext } from '../../context/NotificationContext';

const JOBS_PAGE_SIZE = 10;

function hasMeaningfulData(data) {
  if (!data?.summary) return false;
  const s = data.summary;
  return (
    Number(s.jobs_published) > 0 ||
    Number(s.applications_total) > 0 ||
    Number(s.job_views) > 0 ||
    Number(s.followers) > 0 ||
    Number(s.post_interactions) > 0 ||
    Number(s.profile_visits) > 0
  );
}

export default function CompanyAnalytics() {
  const { role, isPreviewMode } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { showToast } = useNotificationContext();
  const base = role || ROLES.BUSINESS;
  const orgLabels = getOrgLabels(profile);

  const [periodId, setPeriodId] = useState('30d');
  const [jobsOffset, setJobsOffset] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useCompanyAnalyticsBundle({
    periodId,
    jobsOffset,
    jobsLimit: JOBS_PAGE_SIZE,
  });

  const periodLabel = useMemo(
    () => COMPANY_ANALYTICS_PERIODS.find((p) => p.id === periodId)?.label || periodId,
    [periodId],
  );

  const growth = formatGrowthPct(data?.summary?.growth_pct);
  const jobsTotal = data?.jobs_total ?? 0;
  const canPrev = jobsOffset > 0;
  const canNext = jobsOffset + JOBS_PAGE_SIZE < jobsTotal;

  const handlePeriodChange = (id) => {
    setPeriodId(id);
    setJobsOffset(0);
  };

  const handleExportCsv = () => {
    if (!data) return;
    exportCompanyAnalyticsCsv(data, { periodLabel });
    setExportOpen(false);
    showToast('CSV descargado', 'success');
  };

  const handleExportPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportCompanyAnalyticsPdf(data, {
        companyName: profile?.company_name || orgLabels.defaultName,
        periodLabel,
      });
      showToast('PDF descargado', 'success');
    } catch {
      showToast('No se pudo generar el PDF. Inténtalo de nuevo.', 'error');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-dvh bg-app-surface p-space-base" aria-busy="true" aria-label="Cargando">
        <JobListSkeleton count={4} />
      </div>
    );
  }

  if (isPreviewMode) {
    return (
      <CompanyDashboardShell profile={profile}>
        <div className="px-4 py-8 lg:px-8">
          <CompanyAnalyticsEmpty message="Las analíticas no están disponibles en modo vista previa." />
        </div>
      </CompanyDashboardShell>
    );
  }

  return (
    <CompanyDashboardShell profile={profile}>
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-app-muted">Panel · Analíticas</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-app-text">Analíticas</h1>
            <p className="mt-1 max-w-xl text-sm text-app-muted">
              Métricas de tus ofertas, perfil y publicaciones. Solo datos de tu cuenta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={reload}>
              Actualizar
            </Button>
            <div className="relative">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
                disabled={!data || loading}
              >
                <AppIcon icon={Download} size={ICON_SIZES.sm} className="mr-1.5" />
                Exportar
              </Button>
              {exportOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-app-border bg-white shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left text-sm text-app-text hover:bg-app-surface"
                    onClick={handleExportCsv}
                  >
                    Descargar CSV
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left text-sm text-app-text hover:bg-app-surface disabled:opacity-50"
                    onClick={handleExportPdf}
                    disabled={exporting}
                  >
                    {exporting ? 'Generando PDF…' : 'Descargar PDF'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {COMPANY_ANALYTICS_PERIODS.map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => handlePeriodChange(period.id)}
              className={[
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                periodId === period.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-app-muted ring-1 ring-app-border hover:text-app-text',
              ].join(' ')}
            >
              {period.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-8 text-center">
            <p className="text-sm text-app-muted">{EMPTY_ANALYTICS_MESSAGE}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={reload}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {loading && !data ? <div className="mt-6"><CompanyAnalyticsSkeleton /></div> : null}

        {!loading && data && !hasMeaningfulData(data) ? (
          <div className="mt-6">
            <CompanyAnalyticsEmpty />
          </div>
        ) : null}

        {data && hasMeaningfulData(data) ? (
          <div className={`mt-6 space-y-6 ${loading ? 'opacity-70' : ''}`}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
              <MetricCard icon={Briefcase} label="Ofertas publicadas" value={data.summary.jobs_published} />
              <MetricCard icon={Eye} label="Visualizaciones de ofertas" value={data.summary.job_views} />
              <MetricCard icon={FileText} label="Candidaturas recibidas" value={data.summary.applications_total} />
              <MetricCard icon={Check} label="Candidatos aceptados" value={data.summary.applications_accepted} />
              <MetricCard icon={X} label="Candidatos rechazados" value={data.summary.applications_rejected} />
              <MetricCard icon={Clock} label="Candidatos pendientes" value={data.summary.applications_pending} />
              <MetricCard icon={Users} label="Seguidores" value={data.summary.followers} hint={`+${data.summary.followers_new ?? 0} en el período`} />
              <MetricCard icon={MessageSquare} label="Interacciones en publicaciones" value={data.summary.post_interactions} />
              <MetricCard
                icon={ChartColumn}
                label="Crecimiento este período"
                value={data.summary.growth_pct == null ? '—' : `${data.summary.growth_pct}%`}
                hint={growth.text}
              />
            </div>

            <CompanyAnalyticsCharts charts={data.charts} />

            <SectionCard title="Top ofertas" subtitle="Las 5 con más postulaciones">
              {(data.top_jobs ?? []).length === 0 ? (
                <CompanyAnalyticsEmpty />
              ) : (
                <ul className="divide-y divide-app-border">
                  {data.top_jobs.map((job, index) => (
                    <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-app-text">
                          <span className="mr-2 text-app-subtle">{index + 1}.</span>
                          {job.title}
                        </p>
                        <p className="mt-0.5 text-xs text-app-muted">
                          {jobStatusLabel(job.status)} · {job.applications ?? 0} postulaciones · {job.views ?? 0} vistas
                        </p>
                      </div>
                      <Link
                        to={rolePath(base, `/applicants?job=${job.id}`)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        Ver detalles
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Analíticas de empleo" subtitle="Detalle por oferta publicada">
              {(data.jobs ?? []).length === 0 ? (
                <CompanyAnalyticsEmpty />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-app-border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-app-surface text-xs uppercase tracking-wide text-app-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Título</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                          <th className="px-3 py-2 font-medium">Vistas</th>
                          <th className="px-3 py-2 font-medium">Postulaciones</th>
                          <th className="px-3 py-2 font-medium">Pendientes</th>
                          <th className="px-3 py-2 font-medium">Aceptados</th>
                          <th className="px-3 py-2 font-medium">Rechazados</th>
                          <th className="px-3 py-2 font-medium">Publicada</th>
                          <th className="px-3 py-2 font-medium">Activa</th>
                          <th className="px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.jobs.map((job) => (
                          <tr key={job.id} className="border-t border-app-border/70">
                            <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-app-text">{job.title}</td>
                            <td className="px-3 py-2.5 text-app-muted">{jobStatusLabel(job.status)}</td>
                            <td className="px-3 py-2.5">{job.views ?? 0}</td>
                            <td className="px-3 py-2.5">{job.applications ?? 0}</td>
                            <td className="px-3 py-2.5">{job.pending ?? 0}</td>
                            <td className="px-3 py-2.5">{job.accepted ?? 0}</td>
                            <td className="px-3 py-2.5">{job.rejected ?? 0}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-app-muted">
                              {job.created_at
                                ? new Date(job.created_at).toLocaleDateString('es-GQ', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-app-muted">{formatDaysActive(job.days_active)}</td>
                            <td className="px-3 py-2.5">
                              <Link
                                to={rolePath(base, `/applicants?job=${job.id}`)}
                                className="whitespace-nowrap text-sm font-medium text-primary-600 hover:text-primary-700"
                              >
                                Ver detalles
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {jobsTotal > JOBS_PAGE_SIZE ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-app-muted">
                        Mostrando {jobsOffset + 1}–{Math.min(jobsOffset + JOBS_PAGE_SIZE, jobsTotal)} de {jobsTotal}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={!canPrev}
                          onClick={() => setJobsOffset((o) => Math.max(0, o - JOBS_PAGE_SIZE))}
                        >
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={!canNext}
                          onClick={() => setJobsOffset((o) => o + JOBS_PAGE_SIZE)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Perfil de empresa" subtitle="Visitas y clics de contacto">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Eye} label="Visitas al perfil" value={data.profile?.visits} />
                  <MetricCard icon={Users} label="Seguidores" value={data.profile?.followers} />
                  <MetricCard icon={Share2} label="Clics web" value={data.profile?.website_clicks} />
                  <MetricCard icon={MessageSquare} label="Clics WhatsApp" value={data.profile?.whatsapp_clicks} />
                  <MetricCard icon={Mail} label="Clics email" value={data.profile?.email_clicks} />
                  <MetricCard icon={Bookmark} label="Guardaron la empresa" value={data.profile?.saves} />
                </div>
              </SectionCard>

              <SectionCard title="Publicaciones" subtitle="Engagement de tu feed">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Eye} label="Visualizaciones" value={data.posts?.views} />
                  <MetricCard icon={Check} label="Likes" value={data.posts?.likes} />
                  <MetricCard icon={MessageSquare} label="Comentarios" value={data.posts?.comments} />
                  <MetricCard icon={Share2} label="Compartidos externos" value={data.posts?.shares} />
                  <MetricCard icon={Repeat2} label="Reposts" value={data.posts?.reposts} />
                  <MetricCard
                    icon={Users}
                    label="Alcance por reposts"
                    value={data.posts?.repost_reach}
                    hint="Seguidores de quienes compartieron"
                  />
                  <MetricCard
                    icon={Eye}
                    label="Vistas por reposts"
                    value={data.posts?.views_from_reposts}
                    hint="Visualizaciones generadas al ver un repost"
                  />
                  <MetricCard icon={Bookmark} label="Guardados" value={data.posts?.saves} />
                  <MetricCard icon={FileText} label="Publicadas (período)" value={data.posts?.published} />
                </div>
              </SectionCard>
            </div>
          </div>
        ) : null}
      </div>
    </CompanyDashboardShell>
  );
}
