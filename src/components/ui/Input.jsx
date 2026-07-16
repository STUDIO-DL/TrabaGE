import AppIcon from '../common/AppIcon';
import { ICON_SIZES } from '../../constants/icons';

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-space-sm block text-label text-app-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <AppIcon
            icon={Icon}
            size={ICON_SIZES.md}
            className="pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-app-subtle"
          />
        )}
        <input
          id={inputId}
          className={[
            'h-input-md min-h-touch w-full rounded-radius-md border bg-app-card px-space-md text-body-small text-app-text outline-none',
            'transition-colors duration-fast ease-out placeholder:text-app-subtle placeholder:opacity-80',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            'disabled:cursor-not-allowed disabled:bg-app-disabled disabled:text-app-text-disabled',
            Icon ? 'pl-9' : '',
            error ? 'border-error-500 focus:ring-error-100' : 'border-app-border',
          ].join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-space-xs text-caption text-error-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-space-xs text-caption text-app-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}
