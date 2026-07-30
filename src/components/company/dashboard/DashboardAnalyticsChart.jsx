import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import DashboardSectionEmpty from './DashboardSectionEmpty';
import { ChartColumn } from '../../../constants/icons';

function formatDayLabel(day) {
  if (!day) return '';
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function DashboardAnalyticsChart({ data = [] }) {
  const rows = (data ?? []).map((row) => ({
    ...row,
    label: formatDayLabel(row.day),
  }));
  const hasData = rows.some(
    (row) => Number(row.views || 0) > 0 || Number(row.applications || 0) > 0,
  );

  return (
    <section className="surface-card p-space-md">
      <div className="mb-space-md">
        <h2 className="text-body font-semibold text-app-text">Analíticas</h2>
        <p className="mt-space-xs text-caption text-app-muted">Últimos 30 días</p>
      </div>

      {!hasData ? (
        <DashboardSectionEmpty
          icon={ChartColumn}
          title="Aún no hay suficientes datos"
          description="Cuando recibas visitas y candidaturas, verás la evolución aquí."
          compact
        />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                name="Visualizaciones"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="applications"
                name="Candidaturas"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
