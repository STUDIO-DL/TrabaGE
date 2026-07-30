import { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { EMPTY_ANALYTICS_MESSAGE } from './companyAnalyticsPeriods';

const PIE_COLORS = ['#2563eb', '#059669', '#e11d48'];

export function CompanyAnalyticsEmpty({ message = EMPTY_ANALYTICS_MESSAGE }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-app-border bg-app-surface px-4 text-center text-sm text-app-muted">
      {message}
    </div>
  );
}

export function CompanyAnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando analíticas">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-app-border/40" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-app-border/40" />
        <div className="h-72 rounded-2xl bg-app-border/40" />
      </div>
      <div className="h-64 rounded-2xl bg-app-border/40" />
    </div>
  );
}

export function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="surface-card p-4 shadow-sm">
      {Icon ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-surface text-app-text ring-1 ring-app-border">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <p className="mt-3 text-2xl font-bold tracking-tight text-app-text">{value ?? 0}</p>
      <p className="mt-1 text-sm text-app-muted">{label}</p>
      {hint ? <p className="mt-1.5 text-xs text-app-subtle">{hint}</p> : null}
    </div>
  );
}

export function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="surface-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-app-text">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-app-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function hasChartValues(rows, key = 'value') {
  return Array.isArray(rows) && rows.some((row) => Number(row?.[key] || 0) > 0);
}

export function ApplicationsLineChart({ data }) {
  if (!hasChartValues(data)) return <CompanyAnalyticsEmpty />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Line type="monotone" dataKey="value" name="Postulaciones" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ViewsWeekChart({ data }) {
  if (!hasChartValues(data)) return <CompanyAnalyticsEmpty />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Bar dataKey="value" name="Visualizaciones" fill="#0f766e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ApplicationStatusPie({ data }) {
  if (!hasChartValues(data)) return <CompanyAnalyticsEmpty />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopJobsBarChart({ data }) {
  const rows = (data ?? []).map((job) => ({
    label: job.title?.length > 28 ? `${job.title.slice(0, 28)}…` : job.title,
    value: job.applications ?? 0,
  }));
  if (!hasChartValues(rows)) return <CompanyAnalyticsEmpty />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Bar dataKey="value" name="Postulaciones" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartsGrid({ charts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Postulaciones por mes" subtitle="Evolución de candidaturas recibidas">
        <ApplicationsLineChart data={charts?.applications_by_month} />
      </SectionCard>
      <SectionCard title="Visualizaciones por semana" subtitle="Vistas de tus ofertas">
        <ViewsWeekChart data={charts?.views_by_week} />
      </SectionCard>
      <SectionCard title="Estado de candidaturas" subtitle="Pendientes, aceptadas y rechazadas">
        <ApplicationStatusPie data={charts?.application_status} />
      </SectionCard>
      <SectionCard title="Ofertas con mayor rendimiento" subtitle="Top por postulaciones">
        <TopJobsBarChart data={charts?.top_performing_jobs} />
      </SectionCard>
    </div>
  );
}

/** Mount charts only when the section enters the viewport (lazy charts). */
export function CompanyAnalyticsCharts({ charts }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? (
        <ChartsGrid charts={charts} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-app-border/40" />
          ))}
        </div>
      )}
    </div>
  );
}
