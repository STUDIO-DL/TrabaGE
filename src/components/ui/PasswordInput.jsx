import { useState } from 'react';
import AppIcon from '../common/AppIcon';
import { Eye, EyeOff, ICON_SIZES } from '../../constants/icons';

/**
 * Accessible password field with show/hide toggle.
 * Toggle is type="button" so it never submits the form.
 */
export default function PasswordInput({
  label,
  error,
  hint,
  id,
  required,
  className = '',
  autoComplete = 'current-password',
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="mb-space-sm block text-label text-app-muted">
          {label}
          {required ? (
            <span className="text-red-600" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={[
            'h-input-md min-h-touch w-full rounded-radius-md border bg-app-card px-space-md pr-12 text-base text-app-text outline-none',
            'transition-colors duration-fast ease-out placeholder:text-app-subtle placeholder:opacity-80',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            'disabled:cursor-not-allowed disabled:bg-app-disabled disabled:text-app-text-disabled',
            error ? 'border-error-500 focus:ring-error-100' : 'border-app-border',
          ].join(' ')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-space-md top-1/2 -translate-y-1/2 rounded-radius-sm p-space-xs text-app-subtle transition-colors duration-fast ease-out hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={0}
        >
          <AppIcon icon={visible ? EyeOff : Eye} size={ICON_SIZES.md} aria-hidden />
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-space-xs text-caption text-error-600">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={`${inputId}-hint`} className="mt-space-xs text-caption text-app-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
