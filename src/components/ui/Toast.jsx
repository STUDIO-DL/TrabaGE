import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';

const types = {
  success: 'bg-success-600',
  error: 'bg-error-600',
  warning: 'bg-warning-600',
  info: 'bg-slate-900',
};

/** Snackbar / toast notification */
export default function Toast({ message, type = 'info', onDismiss }) {
  return (
    <div
      className={[
        'pointer-events-auto flex min-h-touch max-w-md items-center gap-space-md rounded-radius-md px-space-base py-space-md text-body-small text-white shadow-elevation-3',
        'animate-[snackbarIn_var(--motion-fast)_var(--ease-out)]',
        types[type] || types.info,
      ].join(' ')}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-radius-sm p-0.5 text-white/80 transition-colors duration-fast hover:text-white"
          aria-label="Cerrar"
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-toast flex flex-col items-center gap-space-sm px-space-base">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

/** Alias */
export { Toast as Snackbar };
