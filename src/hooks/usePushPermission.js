import { useCallback, useEffect } from 'react';
import {
  attachNotificationClickHandler,
  bindOneSignalUser,
  clearOneSignalUserId,
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
import { useAuth } from './useAuth';
import { isNativeFilePickActive } from '../utils/appLifecycle';

const foregroundSyncListeners = new Set();

function notifyForegroundSyncListeners() {
  // Skip while the OS file picker is open/settling — sync must not remount UI mid-upload.
  if (isNativeFilePickActive()) return;
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
      // Defer push OS sync slightly so auth soft-resume wins the first paint.
      window.setTimeout(() => notifyForegroundSyncListeners(), 0);
    }
  });

  window.addEventListener('focus', () => {
    window.setTimeout(() => notifyForegroundSyncListeners(), 0);
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

export async function requestOsPushPermission(userId, profileTags = {}) {
  if (typeof window === 'undefined') return false;

  if (isOneSignalConfigured()) {
    const granted = await requestNotificationPermission();
    if (granted && userId) {
      await bindOneSignalUser(userId, profileTags);
    }
    return granted;
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
  const { user, role } = useAuth();

  useEffect(() => {
    void initOneSignal();
    attachNotificationClickHandler();
  }, []);

  useEffect(() => {
    if (user?.id && isOsPushPermissionGranted()) {
      void bindOneSignalUser(user.id, { role });
    }
  }, [role, user?.id]);
}

export function usePushPermissionActions() {
  const { user, role } = useAuth();
  usePushPermission();

  const requestPermission = useCallback(async () => {
    const granted = await requestOsPushPermission(user?.id, { role });
    if (granted && user?.id) {
      await setOneSignalPushEnabled(true);
    }
    return granted;
  }, [role, user?.id]);

  const disablePushSubscription = useCallback(async () => {
    await setOneSignalPushEnabled(false);
  }, []);

  const refreshToken = useCallback(async () => {
    if (!user?.id) return null;
    await bindOneSignalUser(user.id, { role });
    return true;
  }, [role, user?.id]);

  return {
    requestPermission,
    disablePushSubscription,
    refreshToken,
    clearPushTokens: clearOneSignalUserId,
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
