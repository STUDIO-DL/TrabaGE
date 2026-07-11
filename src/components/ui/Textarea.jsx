export default function Textarea({ label, error, hint, className = '', id, rows = 4, ...props }) {
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-space-sm block text-label text-app-muted">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={[
          'w-full resize-y rounded-radius-md border bg-app-card px-space-md py-space-sm text-body-small text-app-text outline-none',
          'transition-colors duration-fast ease-out placeholder:text-app-subtle',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          'disabled:cursor-not-allowed disabled:bg-app-disabled disabled:text-app-text-disabled',
          error ? 'border-error-500 focus:ring-error-100' : 'border-app-border',
        ].join(' ')}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="mt-space-xs text-caption text-error-600">{error}</p>}
      {!error && hint && <p className="mt-space-xs text-caption text-app-subtle">{hint}</p>}
    </div>
  );
}
