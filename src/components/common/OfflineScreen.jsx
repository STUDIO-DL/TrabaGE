import { useCallback, useEffect, useState } from 'react';
import Button from '../ui/Button';
import AppIcon from './AppIcon';
import { WifiOff, ICON_SIZES } from '../../constants/icons';
import {
  getConnectivityState,
  initConnectivityListeners,
  probeConnectivity,
  subscribeConnectivity,
} from '../../utils/connectivity';

/**
 * Non-blocking connectivity banner (Offline First).
 * Cached screens stay usable; we only hint that sync may be delayed.
 */
export default function OfflineScreen() {
  const [state, setState] = useState(() => getConnectivityState());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    initConnectivityListeners();
    return subscribeConnectivity((next) => setState(next));
  }, []);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await probeConnectivity();
    } finally {
      setRetrying(false);
    }
  }, []);

  if (!state.offline && !state.isSlow) return null;

  const isOffline = state.offline;
  const message = isOffline
    ? 'Sin conexión. Sigues viendo el contenido guardado; se sincronizará al volver.'
    : 'Conexión lenta. Mostramos contenido guardado para ahorrar datos.';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center px-space-sm pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-lg items-center gap-space-sm rounded-radius-lg border border-amber-200 bg-amber-50 px-space-md py-space-sm shadow-elevation-1 dark:border-amber-900/50 dark:bg-amber-950/90">
        <AppIcon icon={WifiOff} size={ICON_SIZES.sm} className="shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="min-w-0 flex-1 text-caption leading-snug text-amber-950 dark:text-amber-100">
          {message}
        </p>
        {isOffline ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="!min-h-0 shrink-0 !px-2 !py-1 text-caption text-amber-900 dark:text-amber-100"
            loading={retrying}
            onClick={handleRetry}
          >
            Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
