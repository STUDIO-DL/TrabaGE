import { useCallback, useEffect } from 'react';
import {
  attachNotificationClickHandler,
  bindFcmUser,
  clearFcmUser,
  getNotificationPermissionStatus,
  initFcm,
  isFcmConfigured,
  onPushPermissionChange,
  requestNotificationPermission,
  setFcmPushEnabled,
} from '../config/fcm';
import {
  NOTIFICATION_PERMISSION_STATUS,
} from '../constants/notificationPreferences';
import { shouldAllowForegroundRefresh } from '../utils/backgroundGracePeriod';
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
  const handleForegroundResume = () => {
    if (document.visibilityState !== 'visible') return;
    if (!shouldAllowForegroundRefresh()) return;
    // Defer so auth soft-resume wins the first paint.
    window.setTimeout(() => notifyForegroundSyncListeners(), 0);
  };

  document.addEventListener('visibilitychange', handleForegroundResume);
  window.addEventListener('focus', handleForegroundResume);
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

  if (isFcmConfigured()) {
    const granted = await requestNotificationPermission();
    if (granted && userId) {
      await bindFcmUser(userId, profileTags);
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

  // Idempotent: shares initPromise with main.jsx boot call; safe to await from push flows.
  useEffect(() => {
    void initFcm();
    attachNotificationClickHandler();
  }, []);

  useEffect(() => {
    if (user?.id && isOsPushPermissionGranted()) {
      void bindFcmUser(user.id, { role });
    }
  }, [role, user?.id]);
}

export function usePushPermissionActions() {
  const { user, role } = useAuth();
  usePushPermission();

  const requestPermission = useCallback(async () => {
    const granted = await requestOsPushPermission(user?.id, { role });
    if (granted && user?.id) {
      await setFcmPushEnabled(true, user.id);
    }
    return granted;
  }, [role, user?.id]);

  const disablePushSubscription = useCallback(async () => {
    await setFcmPushEnabled(false);
  }, []);

  const refreshToken = useCallback(async () => {
    if (!user?.id) return null;
    await bindFcmUser(user.id, { role });
    return true;
  }, [role, user?.id]);

  return {
    requestPermission,
    disablePushSubscription,
    refreshToken,
    clearPushTokens: clearFcmUser,
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
