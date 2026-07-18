/**
 * Inline error banner with optional retry — matches Feed error UX.
 */
export default function FetchErrorBanner({
  message = 'No se pudo cargar. Inténtalo de nuevo.',
  onRetry,
  retryLabel = 'Reintentar',
  className = '',
}) {
  return (
    <div
      className={[
        'rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800',
        className,
      ].join(' ')}
      role="alert"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-space-sm font-medium text-error-700 underline transition-colors duration-fast hover:text-error-900"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
