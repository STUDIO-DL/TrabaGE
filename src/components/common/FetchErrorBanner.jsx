import { getUserErrorMessage, isFriendlyUserMessage, looksTechnical } from '../../utils/userFacingError';

const DEFAULT_MESSAGE =
  'No pudimos cargar esta información. Revisa tu conexión y prueba de nuevo.';

/**
 * Inline error banner with optional retry — matches Feed error UX.
 * Always sanitizes the message before rendering.
 */
export default function FetchErrorBanner({
  message = DEFAULT_MESSAGE,
  onRetry,
  retryLabel = 'Reintentar',
  className = '',
}) {
  const safeMessage =
    typeof message === 'string' && isFriendlyUserMessage(message) && !looksTechnical(message)
      ? message
      : getUserErrorMessage(message, { action: 'load', fallback: DEFAULT_MESSAGE });

  return (
    <div
      className={[
        'rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800',
        className,
      ].join(' ')}
      role="alert"
    >
      <p>{safeMessage}</p>
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
