import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  getUserErrorMessage,
  isFriendlyUserMessage,
  looksTechnical,
  toUserFacingError,
} from '../utils/userFacingError';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID();
    let safeMessage = typeof message === 'string' ? message : String(message ?? '');

    // Defense in depth: never surface technical strings in error toasts.
    if (type === 'error' && (!safeMessage || looksTechnical(safeMessage) || !isFriendlyUserMessage(safeMessage))) {
      safeMessage = getUserErrorMessage(message || safeMessage, { action: 'generic' });
    }

    setToasts((prev) => [...prev, { id, message: safeMessage, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  /**
   * Shows a sanitized error toast. Never displays technical messages.
   * @param {unknown} error
   * @param {string | { action?: string, fallback?: string, context?: object }} [actionOrOptions]
   */
  const showErrorToast = useCallback(
    (error, actionOrOptions) => {
      const opts =
        typeof actionOrOptions === 'string'
          ? { action: actionOrOptions }
          : actionOrOptions || {};
      const mapped = toUserFacingError(error, {
        ...opts,
        log: true,
        context: {
          ...(opts.context || {}),
          area: 'toast_error',
        },
      });
      showToast(mapped.message, 'error');
      return mapped;
    },
    [showToast],
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, showToast, showErrorToast, dismissToast, getUserErrorMessage }),
    [toasts, showToast, showErrorToast, dismissToast],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
