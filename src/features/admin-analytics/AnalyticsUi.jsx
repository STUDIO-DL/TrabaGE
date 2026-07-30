import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function AnalyticsEmptyState({ message = 'Datos insuficientes' }) {
  return (
    <div className="flex min-h-[10rem] items-center justify-center rounded-radius-lg border border-dashed border-app-border bg-app-surface px-space-md text-center text-body-small text-app-muted">
      {message}
    </div>
  );
}

export function AnalyticsMetricCard({ label, value, delta }) {
  return (
    <div className="surface-card p-space-md">
      <p className="text-caption font-medium text-app-muted">{label}</p>
      <p className="mt-space-sm text-heading-m font-semibold tracking-tight text-app-text">
        {value ?? 0}
      </p>
      {delta ? (
        <p
          className={[
            'mt-space-xs text-caption',
            delta.tone === 'positive'
              ? 'text-success-600'
              : delta.tone === 'negative'
                ? 'text-error-600'
                : 'text-app-subtle',
          ].join(' ')}
        >
          {delta.text}
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsLineChart({ data, dataKey = 'value', labelKey = 'day', color = '#2563eb' }) {
  if (!data?.length) return <AnalyticsEmptyState />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--app-border))" />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsBarChart({ data, dataKey = 'value', labelKey = 'label', color = '#2563eb' }) {
  if (!data?.length) return <AnalyticsEmptyState />;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--app-border))" />
          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsRankingTable({ columns, rows, emptyMessage = 'Datos insuficientes' }) {
  if (!rows?.length) return <AnalyticsEmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto rounded-radius-lg border border-app-border">
      <table className="min-w-full text-left text-body-small">
        <thead className="bg-app-surface text-caption uppercase tracking-wide text-app-subtle">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-space-sm py-space-sm font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.label ?? index}-${index}`} className="border-t border-app-divider">
              {columns.map((col) => (
                <td key={col.key} className="px-space-sm py-space-sm text-app-text">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsSection({ title, description, children, action }) {
  return (
    <section className="surface-card space-y-space-md p-space-md">
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div>
          <h2 className="text-body font-semibold text-app-text">{title}</h2>
          {description ? (
            <p className="mt-space-xs text-body-small text-app-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
