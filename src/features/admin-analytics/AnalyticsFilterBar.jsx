import { useAnalyticsFilters } from './AnalyticsFiltersContext';
import { ANALYTICS_PERIODS } from './analyticsPeriods';

const selectClass =
  'h-10 w-full rounded-radius-md border border-app-border bg-app-card px-space-sm text-base text-app-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const labelClass = 'space-y-space-xs text-caption font-medium text-app-muted';

export default function AnalyticsFilterBar() {
  const {
    periodId,
    setPeriodId,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    city,
    setCity,
    sector,
    setSector,
    accountRole,
    setAccountRole,
    jobType,
    setJobType,
    workMode,
    setWorkMode,
    cities,
    sectors,
    accountRoleOptions,
    jobTypeOptions,
    workModeOptions,
  } = useAnalyticsFilters();

  return (
    <div className="surface-card space-y-space-md p-space-md">
      <div>
        <p className="text-body-small font-semibold text-app-text">Filtros</p>
        <p className="text-caption text-app-subtle">Datos observados en TrabaGE</p>
      </div>

      <div className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
        <label className={labelClass}>
          Período
          <select
            className={selectClass}
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            {ANALYTICS_PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Ciudad
          <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Todas</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Sector
          <select className={selectClass} value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Todos</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Tipo de cuenta
          <select
            className={selectClass}
            value={accountRole}
            onChange={(e) => setAccountRole(e.target.value)}
          >
            {accountRoleOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Tipo de empleo
          <select
            className={selectClass}
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
          >
            {jobTypeOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Modalidad
          <select
            className={selectClass}
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
          >
            {workModeOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {periodId === 'custom' ? (
        <div className="grid gap-space-sm sm:grid-cols-2">
          <label className={labelClass}>
            Desde
            <input
              type="date"
              className={selectClass}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Hasta
            <input
              type="date"
              className={selectClass}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
