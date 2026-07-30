import { useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { AnalyticsFiltersProvider } from '../../features/admin-analytics/AnalyticsFiltersContext';
import AnalyticsFilterBar from '../../features/admin-analytics/AnalyticsFilterBar';
import { ANALYTICS_TABS } from '../../features/admin-analytics/analyticsPeriods';
import { useAdminAnalyticsBundle } from '../../features/admin-analytics/useAdminAnalyticsBundle';
import {
  EmployersTab,
  GeographyTab,
  JobsTab,
  MarketTab,
  SkillsTab,
  SummaryTab,
  TrendsTab,
  UsersTab,
} from '../../features/admin-analytics/AnalyticsTabs';
import { downloadCsv } from '../../features/admin-analytics/exportAnalyticsCsv';
import {
  downloadBlob,
  generateAnalyticsReportPdf,
} from '../../features/admin-analytics/generateAnalyticsReportPdf';
import AdminTechnicalErrorDetails from '../../components/admin/AdminTechnicalErrorDetails';
import { getUserErrorMessage, ERROR_ACTION } from '../../utils/userFacingError';

function AnalyticsShell() {
  const location = useLocation();
  const { data, loading, error, technical } = useAdminAnalyticsBundle();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const activePath = useMemo(() => {
    const parts = location.pathname.split('/');
    return parts[parts.length - 1] || 'resumen';
  }, [location.pathname]);

  const handlePdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    setPdfError('');
    try {
      const blob = await generateAnalyticsReportPdf(data);
      downloadBlob(blob, 'informe-analitica-trabage.pdf');
    } catch (err) {
      setPdfError(getUserErrorMessage(err, ERROR_ACTION.generate_cv));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSummaryCsv = () => {
    if (!data?.summary) return;
    const rows = Object.entries(data.summary).map(([key, value]) => ({ metric: key, value }));
    downloadCsv('trabage-analitica-resumen.csv', ['metric', 'value'], rows);
  };

  return (
    <div className="motion-page space-y-space-lg">
      <div className="border-b border-app-divider pb-space-md">
        <h2 className="text-title font-semibold tracking-tight text-app-text">Analítica</h2>
        <p className="mt-space-xs text-body-small text-app-muted">
          Indicadores agregados de actividad en TrabaGE.
        </p>
      </div>

      <AnalyticsFilterBar />

      <div
        className="flex gap-space-sm overflow-x-auto border-b border-app-divider pb-px"
        role="tablist"
      >
        {ANALYTICS_TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={`/admin/analytics/${tab.path}`}
            className={({ isActive }) =>
              [
                'motion-tab-indicator whitespace-nowrap border-b-2 px-space-sm py-space-sm text-body-small font-medium',
                isActive || activePath === tab.path
                  ? 'border-primary-600 bg-primary-50/60 font-semibold text-primary-700'
                  : 'border-transparent text-app-muted hover:bg-primary-50/30 hover:text-app-text',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
          <p className="mt-1 text-xs text-rose-600">
            Si acabas de desplegar, asegúrate de haber aplicado la última migración de analítica.
          </p>
          {technical ? (
            <AdminTechnicalErrorDetails
              errorId={technical.errorId}
              type={technical.type}
              action={technical.action}
              originalMessage={technical.message}
              code={technical.code}
              status={technical.status}
              stack={technical.stack}
              route={location.pathname}
              occurredAt={new Date().toLocaleString('es-GQ')}
            />
          ) : null}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <Routes>
          <Route index element={<Navigate to="resumen" replace />} />
          <Route path="resumen" element={<SummaryTab data={data} />} />
          <Route path="usuarios" element={<UsersTab data={data} />} />
          <Route path="empresas" element={<EmployersTab data={data} />} />
          <Route path="mercado" element={<MarketTab data={data} />} />
          <Route path="empleos" element={<JobsTab data={data} />} />
          <Route path="habilidades" element={<SkillsTab data={data} />} />
          <Route path="geografia" element={<GeographyTab data={data} />} />
          <Route path="tendencias" element={<TrendsTab data={data} />} />
          <Route
            path="informes"
            element={
              <div className="space-y-4 rounded-radius-lg border border-app-border bg-app-card p-4">
                <h3 className="text-base font-semibold text-app-text">Generar informe</h3>
                <p className="text-sm text-app-muted">
                  El informe usa exactamente los filtros y el período seleccionados arriba. Incluye
                  resumen, rankings y notas metodológicas.
                </p>
                {pdfError ? <p className="text-sm text-rose-600">{pdfError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handlePdf} loading={pdfLoading}>
                    Descargar PDF
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSummaryCsv}>
                    Descargar CSV (resumen)
                  </Button>
                </div>
                <p className="text-xs text-app-muted">{data.methodology}</p>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="resumen" replace />} />
        </Routes>
      ) : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AnalyticsFiltersProvider>
      <AnalyticsShell />
    </AnalyticsFiltersProvider>
  );
}
