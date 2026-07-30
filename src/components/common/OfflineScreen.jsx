import { useCallback, useEffect, useState } from 'react';
import Button from '../ui/Button';
import AppIcon from './AppIcon';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import { WifiOff, ICON_SIZES } from '../../constants/icons';
import {
  getConnectivityState,
  initConnectivityListeners,
  probeConnectivity,
  subscribeConnectivity,
} from '../../utils/connectivity';

/**
 * Full-screen offline / unreachable experience.
 * Triggered by navigator.onLine OR real network/fetch failures.
 */
export default function OfflineScreen() {
  const [offline, setOffline] = useState(() => getConnectivityState().offline);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    initConnectivityListeners();
    return subscribeConnectivity((next) => setOffline(next.offline));
  }, []);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await probeConnectivity();
    } finally {
      setRetrying(false);
    }
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-app-bg px-space-lg text-center"
      role="alert"
      aria-live="assertive"
    >
      <TrabaGEWordmark size="lg" className="mb-space-lg" />
      <span className="mb-space-lg flex h-16 w-16 items-center justify-center rounded-radius-circular bg-amber-50 ring-1 ring-inset ring-amber-200">
        <AppIcon icon={WifiOff} size={ICON_SIZES.lg} className="text-amber-700" />
      </span>
      <h1 className="text-title font-semibold text-app-text">Sin conexión a Internet</h1>
      <p className="mt-space-sm max-w-sm text-body text-app-muted">
        Revisa tu conexión y vuelve a intentarlo.
      </p>
      <Button
        type="button"
        className="mt-space-xl"
        loading={retrying}
        onClick={handleRetry}
      >
        Reintentar
      </Button>
    </div>
  );
}
