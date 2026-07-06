import AppIcon from '../common/AppIcon';
import { ICON_SIZES } from '../../constants/icons';

export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-app-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <AppIcon
            icon={Icon}
            size={ICON_SIZES.default}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted/70"
          />
        )}
        <input
          id={inputId}
          className={[
            'w-full rounded-xl border bg-app-card px-3.5 py-2 text-sm text-app-text outline-none transition-colors placeholder:text-app-muted/70',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            Icon ? 'pl-10' : '',
            error ? 'border-red-500' : 'border-app-border',
          ].join(' ')}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
