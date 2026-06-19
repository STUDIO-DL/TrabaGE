import { useEffect } from 'react';
import { isOneSignalConfigured, requestNotificationPermission } from '../config/onesignal';

const PROMPT_KEY = 'trabage_push_prompted';

export function usePushPermission() {
  useEffect(() => {
    if (!isOneSignalConfigured()) return;
    if (localStorage.getItem(PROMPT_KEY) === 'true') return;

    requestNotificationPermission().finally(() => {
      localStorage.setItem(PROMPT_KEY, 'true');
    });
  }, []);
}
