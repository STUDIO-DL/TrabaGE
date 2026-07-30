import { formatDelta, hasRankingData } from './analyticsPeriods';
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
  AnalyticsMetricCard,
  AnalyticsRankingTable,
  AnalyticsSection,
} from './AnalyticsUi';
import { downloadCsv } from './exportAnalyticsCsv';

function s(summary, key) {
  return summary?.[key] ?? 0;
}

export function SummaryTab({ data }) {
  const summary = data?.summary ?? {};
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{data?.disclaimer}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          label="Perfiles personales"
          value={s(summary, 'users_total')}
          delta={formatDelta(s(summary, 'users_new'), s(summary, 'users_new_prev'))}
        />
        <AnalyticsMetricCard
          label="Empresas"
          value={s(summary, 'business_total')}
          delta={formatDelta(s(summary, 'business_new'), s(summary, 'business_new_prev'))}
        />
        <AnalyticsMetricCard
          label="Organizaciones"
          value={s(summary, 'org_total')}
          delta={formatDelta(s(summary, 'org_new'), s(summary, 'org_new_prev'))}
        />
        <AnalyticsMetricCard label="Ofertas activas" value={s(summary, 'jobs_active')} />
        <AnalyticsMetricCard
          label="Ofertas nuevas (período)"
          value={s(summary, 'jobs_new')}
          delta={formatDelta(s(summary, 'jobs_new'), s(summary, 'jobs_new_prev'))}
        />
        <AnalyticsMetricCard
          label="Candidaturas (período)"
          value={s(summary, 'applications_total')}
          delta={formatDelta(s(summary, 'applications_total'), s(summary, 'applications_prev'))}
        />
        <AnalyticsMetricCard
          label="Publicaciones (período)"
          value={s(summary, 'posts_total')}
          delta={formatDelta(s(summary, 'posts_total'), s(summary, 'posts_prev'))}
        />
        <AnalyticsMetricCard
          label="Mensajes (período)"
          value={s(summary, 'messages_total')}
          delta={formatDelta(s(summary, 'messages_total'), s(summary, 'messages_prev'))}
        />
      </div>

      <AnalyticsSection title="Evolución de altas personales" description="Registros diarios en el período">
        <AnalyticsLineChart data={data?.timeseries?.users ?? []} />
      </AnalyticsSection>
      <AnalyticsSection title="Evolución de ofertas" description="Ofertas creadas por día">
        <AnalyticsLineChart data={data?.timeseries?.jobs ?? []} color="#7c3aed" />
      </AnalyticsSection>
    </div>
  );
}

export function UsersTab({ data }) {
  const summary = data?.summary ?? {};
  const rankings = data?.rankings ?? {};
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard label="Total personales" value={s(summary, 'users_total')} />
        <AnalyticsMetricCard label="Nuevos en período" value={s(summary, 'users_new')} />
        <AnalyticsMetricCard label="Perfil completo" value={s(summary, 'users_setup_complete')} />
        <AnalyticsMetricCard label="Perfil incompleto" value={s(summary, 'users_setup_incomplete')} />
        <AnalyticsMetricCard label="Con CV" value={s(summary, 'users_with_cv')} />
        <AnalyticsMetricCard label="Con candidatura (período)" value={s(summary, 'users_with_application')} />
        <AnalyticsMetricCard label="Con publicación (período)" value={s(summary, 'users_with_post')} />
        <AnalyticsMetricCard label="Con servicios" value={s(summary, 'users_with_service')} />
      </div>
      <AnalyticsSection
        title="Usuarios por ciudad"
        description="Solo grupos con al menos 5 perfiles (privacidad)"
        action={
          hasRankingData(rankings.users_by_city) ? (
            <button
              type="button"
              className="text-sm font-medium text-primary-600"
              onClick={() =>
                downloadCsv(
                  'trabage-usuarios-ciudad.csv',
                  ['label', 'value'],
                  rankings.users_by_city,
                )
              }
            >
              CSV
            </button>
          ) : null
        }
      >
        <AnalyticsBarChart data={rankings.users_by_city ?? []} />
      </AnalyticsSection>
      <AnalyticsSection title="Usuarios por sector">
        <AnalyticsBarChart data={rankings.users_by_sector ?? []} color="#2563eb" />
      </AnalyticsSection>
      <AnalyticsSection title="Áreas de formación más frecuentes">
        <AnalyticsRankingTable
          columns={[
            { key: 'label', label: 'Programa / área' },
            { key: 'value', label: 'Perfiles' },
          ]}
          rows={rankings.education_areas ?? []}
        />
      </AnalyticsSection>
    </div>
  );
}

export function EmployersTab({ data }) {
  const summary = data?.summary ?? {};
  const rankings = data?.rankings ?? {};
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard label="Empresas" value={s(summary, 'business_total')} />
        <AnalyticsMetricCard label="Organizaciones" value={s(summary, 'org_total')} />
        <AnalyticsMetricCard label="Verificadas" value={s(summary, 'employers_verified')} />
        <AnalyticsMetricCard label="Activas" value={s(summary, 'employers_active')} />
        <AnalyticsMetricCard label="Con ofertas (período)" value={s(summary, 'employers_with_jobs')} />
        <AnalyticsMetricCard label="Con publicaciones (período)" value={s(summary, 'employers_with_posts')} />
        <AnalyticsMetricCard label="Empresas nuevas" value={s(summary, 'business_new')} />
        <AnalyticsMetricCard label="Organizaciones nuevas" value={s(summary, 'org_new')} />
      </div>
      <AnalyticsSection title="Empleadores por ciudad">
        <AnalyticsBarChart data={rankings.employers_by_city ?? []} />
      </AnalyticsSection>
      <AnalyticsSection title="Empleadores por sector">
        <AnalyticsBarChart data={rankings.employers_by_sector ?? []} color="#0f766e" />
      </AnalyticsSection>
    </div>
  );
}

function demandLabel(row) {
  const offers = row.offers ?? 0;
  const apps = row.applications ?? 0;
  const candidates = row.candidates ?? 0;
  if (offers < 2 && apps < 2) return 'Datos insuficientes';
  if (offers >= 3 && candidates > 0 && offers / Math.max(candidates, 1) >= 1.5) {
    return 'Alta demanda empresarial relativa';
  }
  if (apps >= 3 && offers > 0 && apps / offers >= 3) return 'Alta competencia entre candidatos';
  if (offers >= 2 && apps >= 2) return 'Equilibrio relativo';
  return 'Indicador preliminar';
}

export function MarketTab({ data }) {
  const rankings = data?.rankings ?? {};
  const rows = (rankings.sector_activity ?? []).map((row) => ({
    ...row,
    signal: demandLabel(row),
  }));
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Inteligencia del mercado laboral · {data?.disclaimer}. No se extrapolan conclusiones a todo
        el país.
      </p>
      <AnalyticsSection title="Actividad por sector">
        <AnalyticsRankingTable
          columns={[
            { key: 'label', label: 'Sector' },
            { key: 'offers', label: 'Ofertas' },
            { key: 'employers', label: 'Empleadores' },
            { key: 'candidates', label: 'Candidatos (perfil)' },
            { key: 'applications', label: 'Candidaturas' },
            { key: 'signal', label: 'Lectura relativa' },
          ]}
          rows={rows}
        />
      </AnalyticsSection>
      <AnalyticsSection title="Ofertas por sector">
        <AnalyticsBarChart
          data={(rankings.sector_activity ?? []).map((r) => ({ label: r.label, value: r.offers }))}
        />
      </AnalyticsSection>
    </div>
  );
}

export function JobsTab({ data }) {
  const summary = data?.summary ?? {};
  const rankings = data?.rankings ?? {};
  const rows = (rankings.job_titles ?? []).map((row) => ({
    ...row,
    ratio:
      row.offers > 0 ? (row.applications / row.offers).toFixed(1) : '—',
    signal: demandLabel({
      offers: row.offers,
      applications: row.applications,
      candidates: 0,
    }),
  }));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard label="Ofertas (filtro)" value={s(summary, 'jobs_total')} />
        <AnalyticsMetricCard label="Activas" value={s(summary, 'jobs_active')} />
        <AnalyticsMetricCard label="Cerradas" value={s(summary, 'jobs_closed')} />
        <AnalyticsMetricCard label="Nuevas (período)" value={s(summary, 'jobs_new')} />
      </div>
      <AnalyticsSection
        title="Puestos más publicados"
        description="Agrupados por título exacto observado en TrabaGE (sin normalización arbitraria)"
        action={
          hasRankingData(rows) ? (
            <button
              type="button"
              className="text-sm font-medium text-primary-600"
              onClick={() =>
                downloadCsv('trabage-puestos.csv', ['label', 'offers', 'applications', 'ratio'], rows)
              }
            >
              CSV
            </button>
          ) : null
        }
      >
        <AnalyticsRankingTable
          columns={[
            { key: 'label', label: 'Puesto' },
            { key: 'offers', label: 'Ofertas' },
            { key: 'applications', label: 'Candidaturas' },
            { key: 'ratio', label: 'Candidaturas / oferta' },
            { key: 'signal', label: 'Lectura relativa' },
          ]}
          rows={rows}
        />
      </AnalyticsSection>
      <AnalyticsSection title="Candidaturas diarias">
        <AnalyticsLineChart data={data?.timeseries?.applications ?? []} color="#db2777" />
      </AnalyticsSection>
    </div>
  );
}

const GAP_LABELS = {
  posible_brecha: 'Posible brecha (indicador)',
  cobertura_relativa: 'Cobertura relativa',
  indicador_preliminar: 'Indicador preliminar',
};

export function SkillsTab({ data }) {
  const rankings = data?.rankings ?? {};
  const gaps = (rankings.skill_gaps ?? []).map((row) => ({
    ...row,
    status_label: GAP_LABELS[row.status] || row.status,
  }));
  return (
    <div className="space-y-4">
      <AnalyticsSection title="Habilidades más solicitadas en ofertas">
        <AnalyticsBarChart data={rankings.skills_demand ?? []} />
      </AnalyticsSection>
      <AnalyticsSection title="Habilidades más presentes en perfiles">
        <AnalyticsBarChart data={rankings.skills_supply ?? []} color="#2563eb" />
      </AnalyticsSection>
      <AnalyticsSection
        title="Demanda vs disponibilidad"
        description="Comparación observacional. Una posible brecha no implica escasez nacional."
      >
        <AnalyticsRankingTable
          columns={[
            { key: 'label', label: 'Habilidad' },
            { key: 'demand', label: 'Demanda (ofertas)' },
            { key: 'supply', label: 'Presencia (perfiles)' },
            { key: 'status_label', label: 'Estado' },
          ]}
          rows={gaps}
          emptyMessage="Datos insuficientes para comparar habilidades"
        />
      </AnalyticsSection>
    </div>
  );
}

export function GeographyTab({ data }) {
  const rankings = data?.rankings ?? {};
  return (
    <div className="space-y-4">
      <AnalyticsSection title="Actividad por ciudad (ofertas del período)">
        <AnalyticsRankingTable
          columns={[
            { key: 'label', label: 'Ciudad' },
            { key: 'offers', label: 'Ofertas' },
            { key: 'candidates', label: 'Candidatos' },
            { key: 'employers', label: 'Empleadores' },
            { key: 'applications', label: 'Candidaturas' },
          ]}
          rows={rankings.geo_activity ?? []}
        />
      </AnalyticsSection>
      <AnalyticsSection title="Usuarios por ciudad">
        <AnalyticsBarChart data={rankings.users_by_city ?? []} />
      </AnalyticsSection>
      <AnalyticsSection title="Empleadores por ciudad">
        <AnalyticsBarChart data={rankings.employers_by_city ?? []} color="#0f766e" />
      </AnalyticsSection>
    </div>
  );
}

export function TrendsTab({ data }) {
  const trends = data?.trends ?? [];
  return (
    <div className="space-y-4">
      <AnalyticsSection
        title="Cambios significativos"
        description="Solo se listan métricas con al menos 3 observaciones en el período actual o anterior."
      >
        <AnalyticsRankingTable
          columns={[
            { key: 'label', label: 'Indicador' },
            { key: 'previous', label: 'Período anterior' },
            { key: 'current', label: 'Período actual' },
            { key: 'delta', label: 'Variación' },
            {
              key: 'delta_pct',
              label: '%',
              render: (row) => (row.delta_pct == null ? 'Datos insuficientes' : `${row.delta_pct}%`),
            },
          ]}
          rows={trends}
          emptyMessage="No hay variaciones con datos suficientes"
        />
      </AnalyticsSection>
    </div>
  );
}
