import Select from './Select';
import { MONTH_OPTIONS, buildYearOptions } from '../../utils/educationDates';

export default function MonthYearSelect({
  label,
  month,
  year,
  onMonthChange,
  onYearChange,
  error,
  required,
  disabled = false,
  idPrefix = 'date',
}) {
  const yearOptions = buildYearOptions();

  return (
    <fieldset className="min-w-0 w-full">
      {label && (
        <legend className="mb-space-sm block text-label text-app-muted">
          {label}
          {required ? <span className="text-red-600" aria-hidden="true"> *</span> : null}
        </legend>
      )}
      <div className="grid min-w-0 grid-cols-2 gap-space-xs sm:gap-space-sm">
        <div className="min-w-0">
          <Select
            id={`${idPrefix}-month`}
            aria-label={label ? `${label} — mes` : 'Mes'}
            value={month}
            onChange={(event) => onMonthChange?.(event.target.value)}
            options={MONTH_OPTIONS}
            disabled={disabled}
          />
        </div>
        <div className="min-w-0">
          <Select
            id={`${idPrefix}-year`}
            aria-label={label ? `${label} — año` : 'Año'}
            value={year}
            onChange={(event) => onYearChange?.(event.target.value)}
            options={yearOptions}
            disabled={disabled}
          />
        </div>
      </div>
      {error && (
        <p className="mt-space-xs text-caption text-error-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
