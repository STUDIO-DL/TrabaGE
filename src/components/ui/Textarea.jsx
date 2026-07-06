export default function Textarea({ label, error, className = '', id, rows = 4, ...props }) {
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-app-muted">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={[
          'w-full resize-y rounded-xl border bg-app-card px-3.5 py-2 text-sm text-app-text outline-none transition-colors placeholder:text-app-muted/70',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          error ? 'border-red-500' : 'border-app-border',
        ].join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
