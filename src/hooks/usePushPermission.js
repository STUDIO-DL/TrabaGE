import { useEffect } from 'react';
import { initOneSignal, isOneSignalConfigured } from '../config/onesignal';

export function usePushPermission() {
  useEffect(() => {
    if (!isOneSignalConfigured()) return;
    void initOneSignal();
  }, []);
}
