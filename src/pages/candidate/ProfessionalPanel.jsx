import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageContainer from '../../components/layout/PageContainer';
import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import FetchErrorBanner from '../../components/common/FetchErrorBanner';
import {
  ArrowLeft,
  ChartColumn,
  Eye,
  Heart,
  MessageSquare,
  Repeat2,
  ICON_SIZES,
} from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useProfessionalPanel } from '../../features/professional-panel/hooks/useProfessionalPanel';
import {
  PROFESSIONAL_PANEL_PERIODS,
  formatPanelCount,
} from '../../features/professional-panel/domain/periods';
import { buildProfessionalTeaser } from '../../features/professional-panel/domain/teaserCopy';
import { topBarInnerClass, topBarOuterClass } from '../../components/layout/TopBar';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-radius-md border border-app-border bg-app-card p-space-base">
      <span className="flex h-9 w-9 items-center justify-center rounded-radius-md bg-app-surface ring-1 ring-app-border">
        <AppIcon icon={Icon} size={ICON_SIZES.md} className="text-app-text" />
      </span>
      <p className="mt-space-sm text-heading-m font-semibold tracking-tight text-app-text">
        {formatPanelCount(value)}
      </p>
      <p className="mt-0.5 text-caption text-app-muted">{label}</p>
    </div>
  );
}

export default function ProfessionalPanel() {
  const navigate = useNavigate();
  const { isPreviewMode } = useAuth();
  const [periodId, setPeriodId] = useState('30d');
  const { data, loading, error, reload } = useProfessionalPanel({
    periodId,
    enabled: !isPreviewMode,
  });

  const summary = data?.summary;
  const periodMeta = PROFESSIONAL_PANEL_PERIODS.find((p) => p.id === periodId);
  const teaser = buildProfessionalTeaser(summary, { days: periodMeta?.days ?? 30 });

  const chartData = useMemo(() => {
    const rows = Array.isArray(data?.series) ? data.series : [];
    return rows.map((row) => ({
      day: String(row.day || '').slice(5),
      profile_views: Number(row.profile_views) || 0,
      interactions: Number(row.interactions) || 0,
    }));
  }, [data?.series]);

  const hasChart = chartData.some(
    (row) => row.profile_views > 0 || row.interactions > 0,
  );

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate('/personal/profile', { replace: true });
  };

  return (
    <PageContainer bottomNav={false}>
      <header className={topBarOuterClass}>
        <div className={topBarInnerClass}>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
            aria-label="Volver al perfil"
          >
            <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-subtitle font-semibold text-app-text">
            Panel profesional
          </h1>
        </div>
      </header>

      <div className="space-y-space-base px-space-base py-space-base pb-space-xl">
        {isPreviewMode ? (
          <p className="rounded-radius-md border border-dashed border-app-border bg-app-surface px-space-base py-space-xl text-center text-body-small text-app-muted">
            El Panel profesional no está disponible en modo vista previa.
          </p>
        ) : (
          <>
            <div>
              <p className="text-body-small text-app-muted">
                Estadísticas de tu perfil y publicaciones. Solo visibles para ti.
              </p>
              {teaser.growthPct != null ? (
                <p className="mt-space-xs text-caption font-medium text-success-600">
                  ↗ +{teaser.growthPct}% respecto al periodo anterior
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-space-xs">
              {PROFESSIONAL_PANEL_PERIODS.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => setPeriodId(period.id)}
                  className={[
                    'rounded-radius-full px-space-md py-space-xs text-caption font-medium transition-colors duration-fast',
                    periodId === period.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-app-surface text-app-muted ring-1 ring-app-border hover:text-app-text',
                  ].join(' ')}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {error ? (
              <FetchErrorBanner
                message={getSupabaseErrorMessage(
                  error,
                  'No se pudieron cargar las estadísticas.',
                )}
                onRetry={reload}
              />
            ) : null}

            {loading && !data ? (
              <div className="grid grid-cols-2 gap-space-sm" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-radius-md bg-app-border/40"
                  />
                ))}
              </div>
            ) : null}

            {data ? (
              <>
                <div className="grid grid-cols-2 gap-space-sm">
                  <MetricCard
                    icon={Eye}
                    label="Visualizaciones del perfil"
                    value={summary?.profile_views}
                  />
                  <MetricCard
                    icon={ChartColumn}
                    label="Visualizaciones de publicaciones"
                    value={summary?.post_views}
                  />
                  <MetricCard
                    icon={Heart}
                    label="Me gusta recibidos"
                    value={summary?.likes}
                  />
                  <MetricCard
                    icon={MessageSquare}
                    label="Comentarios recibidos"
                    value={summary?.comments}
                  />
                  <MetricCard
                    icon={Repeat2}
                    label="Reposts recibidos"
                    value={summary?.reposts}
                  />
                  <MetricCard
                    icon={ChartColumn}
                    label="Interacciones totales"
                    value={summary?.interactions}
                  />
                </div>

                <section className="rounded-radius-md border border-app-border bg-app-card p-space-base">
                  <h2 className="text-body font-semibold text-app-text">Actividad diaria</h2>
                  <p className="mt-0.5 text-caption text-app-muted">
                    Visualizaciones del perfil e interacciones
                  </p>
                  {hasChart ? (
                    <div className="mt-space-md h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="profile_views"
                            name="Perfil"
                            stroke="#2563EB"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="interactions"
                            name="Interacciones"
                            stroke="#16A34A"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="mt-space-md rounded-radius-md border border-dashed border-app-border bg-app-surface px-space-base py-space-xl text-center text-body-small text-app-muted">
                      Aún no hay suficiente actividad en este periodo.
                    </p>
                  )}
                </section>

                <div className="flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={reload}>
                    Actualizar
                  </Button>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
