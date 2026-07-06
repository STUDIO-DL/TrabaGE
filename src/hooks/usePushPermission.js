import { useCallback, useEffect } from 'react';
import {
  getNotificationPermissionStatus,
  initOneSignal,
  isOneSignalConfigured,
  requestNotificationPermission,
  setOneSignalPushEnabled,
} from '../config/onesignal';
import {
  NOTIFICATION_PERMISSION_STATUS,
} from '../constants/notificationPreferences';

export function getOsPushPermissionStatus() {
  const status = getNotificationPermissionStatus();
  if (status === 'granted') return NOTIFICATION_PERMISSION_STATUS.GRANTED;
  if (status === 'denied') return NOTIFICATION_PERMISSION_STATUS.DENIED;
  return NOTIFICATION_PERMISSION_STATUS.DEFAULT;
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
  };
}
