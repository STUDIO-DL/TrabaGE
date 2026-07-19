import { useCallback, useEffect } from 'react';
import {
  getNotificationPermissionStatus,
  initOneSignal,
  isOneSignalConfigured,
  onPushPermissionChange,
  requestNotificationPermission,
  setOneSignalPushEnabled,
} from '../config/onesignal';
import {
  NOTIFICATION_PERMISSION_STATUS,
} from '../constants/notificationPreferences';

const foregroundSyncListeners = new Set();

function notifyForegroundSyncListeners() {
  foregroundSyncListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors during sync.
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      notifyForegroundSyncListeners();
    }
  });

  window.addEventListener('focus', () => {
    notifyForegroundSyncListeners();
  });
}

export function subscribePushForegroundSync(listener) {
  foregroundSyncListeners.add(listener);
  return () => foregroundSyncListeners.delete(listener);
}

export function getOsPushPermissionStatus() {
  const status = getNotificationPermissionStatus();
  if (status === NOTIFICATION_PERMISSION_STATUS.GRANTED) {
    return NOTIFICATION_PERMISSION_STATUS.GRANTED;
  }
  if (status === NOTIFICATION_PERMISSION_STATUS.DENIED) {
    return NOTIFICATION_PERMISSION_STATUS.DENIED;
  }
  return NOTIFICATION_PERMISSION_STATUS.DEFAULT;
}

export function isOsPushPermissionGranted() {
  return getOsPushPermissionStatus() === NOTIFICATION_PERMISSION_STATUS.GRANTED;
}

export function isOsPushPermissionDenied() {
  return getOsPushPermissionStatus() === NOTIFICATION_PERMISSION_STATUS.DENIED;
}

export async function requestOsPushPermission() {
  if (typeof window === 'undefined') return false;

  if (isOneSignalConfigured()) {
    return requestNotificationPermission();
  }

  if (!('Notification' in window)) return false;

  if (Notification.permission === NOTIFICATION_PERMISSION_STATUS.GRANTED) {
    return true;
  }

  if (Notification.permission === NOTIFICATION_PERMISSION_STATUS.DENIED) {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === NOTIFICATION_PERMISSION_STATUS.GRANTED;
}

export function usePushPermission() {
  useEffect(() => {
    void initOneSignal();
  }, []);
}

export function usePushPermissionActions() {
  usePushPermission();

  const requestPermission = useCallback(async () => {
    const granted = await requestOsPushPermission();
    if (granted) {
      await setOneSignalPushEnabled(true);
    }
    return granted;
  }, []);

  const disablePushSubscription = useCallback(async () => {
    await setOneSignalPushEnabled(false);
  }, []);

  return {
    requestPermission,
    disablePushSubscription,
    getPermissionStatus: getOsPushPermissionStatus,
    isPermissionGranted: isOsPushPermissionGranted,
    isPermissionDenied: isOsPushPermissionDenied,
  };
}

export function usePushForegroundSync(onSync) {
  useEffect(() => {
    if (!onSync) return undefined;

    const handler = () => {
      void onSync();
    };

    const unsubscribeForeground = subscribePushForegroundSync(handler);
    const unsubscribePermission = onPushPermissionChange(handler);

    return () => {
      unsubscribeForeground();
      unsubscribePermission();
    };
  }, [onSync]);
}
