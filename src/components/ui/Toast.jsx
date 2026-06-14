const types = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-gray-900',
};

export default function Toast({ message, type = 'info', onDismiss }) {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${types[type] || types.info}`}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-white/80 hover:text-white">
          ✕
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4">
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
