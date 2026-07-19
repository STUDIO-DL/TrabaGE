import { useCallback, useEffect, useMemo, useState } from 'react';

import { setOneSignalPushEnabled, syncOneSignalNotificationTags } from '../config/onesignal';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PERMISSION_STATUS,
} from '../constants/notificationPreferences';
import {
  normalizeNotificationPreferences,
  notificationPreferencesService,
} from '../services/notificationPreferences.service';
import {
  usePushForegroundSync,
  usePushPermissionActions,
} from './usePushPermission';
import { reportError } from '../utils/logger';

export function useNotificationPreferences(userId, { disabled = false } = {}) {
  const {
    requestPermission,
    disablePushSubscription,
    getPermissionStatus,
    isPermissionGranted,
    isPermissionDenied,
  } = usePushPermissionActions();
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [error, setError] = useState(null);
  const [permissionMessage, setPermissionMessage] = useState(null);
  const [permissionRevision, setPermissionRevision] = useState(0);

  const bumpPermissionRevision = useCallback(() => {
    setPermissionRevision((current) => current + 1);
  }, []);

  const savePatch = useCallback(
    async (patch, key = 'preferences') => {
      if (!userId) return { data: null, error: new Error('Usuario no autenticado') };

      const previous = preferences;
      const optimistic = normalizeNotificationPreferences({ ...preferences, ...patch });
      setPreferences(optimistic);
      setSavingKey(key);
      setSavedKey(null);
      setError(null);

      const { data, error: saveError } = await notificationPreferencesService.update(userId, patch);
      if (saveError) {
        setPreferences(previous);
        setError(saveError);
        setSavingKey(null);
        return { data: null, error: saveError };
      }

      const normalized = normalizeNotificationPreferences(data);
      setPreferences(normalized);
      setSavingKey(null);
      setSavedKey(key);
      window.setTimeout(() => setSavedKey((current) => (current === key ? null : current)), 1800);
      void syncOneSignalNotificationTags(normalized);
      return { data: normalized, error: null };
    },
    [preferences, userId],
  );

  const syncWithOsPermission = useCallback(async () => {
    if (disabled || !userId || loading) return;

    bumpPermissionRevision();
    const osStatus = getPermissionStatus();

    if (osStatus === NOTIFICATION_PERMISSION_STATUS.GRANTED) {
      if (preferences.push_enabled) {
        await setOneSignalPushEnabled(true);
        if (preferences.permission_status !== NOTIFICATION_PERMISSION_STATUS.GRANTED) {
          await savePatch({
            permission_status: NOTIFICATION_PERMISSION_STATUS.GRANTED,
          }, 'sync');
        }
      }
      return;
    }

    if (osStatus === NOTIFICATION_PERMISSION_STATUS.DENIED) {
      if (preferences.permission_status === NOTIFICATION_PERMISSION_STATUS.GRANTED) {
        await disablePushSubscription();
        await savePatch({
          permission_status: NOTIFICATION_PERMISSION_STATUS.DENIED,
        }, 'sync');
      }
      return;
    }
  }, [
    bumpPermissionRevision,
    disabled,
    disablePushSubscription,
    getPermissionStatus,
    loading,
    preferences.permission_status,
    preferences.push_enabled,
    savePatch,
    userId,
  ]);

  useEffect(() => {
    let mounted = true;

    if (disabled || !userId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    notificationPreferencesService
      .getOrCreate(userId)
      .then(({ data, error: loadError }) => {
        if (!mounted) return;
        if (loadError) {
          setError(loadError);
          return;
        }
        const normalized = normalizeNotificationPreferences(data);
        setPreferences(normalized);
        void syncOneSignalNotificationTags(normalized);
      })
      .catch((loadError) => {
        reportError(loadError, { area: 'notification_preferences_load', userId });
        if (mounted) setError(loadError);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [disabled, userId]);

  useEffect(() => {
    if (loading || disabled || !userId) return;
    void syncWithOsPermission();
  }, [disabled, loading, syncWithOsPermission, userId]);

  usePushForegroundSync(syncWithOsPermission);

  const setMasterEnabled = useCallback(
    async (enabled) => {
      setPermissionMessage(null);

      if (!enabled) {
        await disablePushSubscription();
        return savePatch({ push_enabled: false }, 'push_enabled');
      }

      const osStatus = getPermissionStatus();

      if (osStatus === NOTIFICATION_PERMISSION_STATUS.DENIED) {
        setPermissionMessage('blocked');
        return { data: null, error: null };
      }

      if (osStatus === NOTIFICATION_PERMISSION_STATUS.GRANTED) {
        await setOneSignalPushEnabled(true);
        const result = await savePatch({
          push_enabled: true,
          permission_status: NOTIFICATION_PERMISSION_STATUS.GRANTED,
          permission_prompted_at: preferences.permission_prompted_at ?? new Date().toISOString(),
        }, 'push_enabled');
        if (!result.error) {
          setPermissionMessage('granted');
        }
        return result;
      }

      const granted = await requestPermission();

      if (!granted) {
        const newStatus = getPermissionStatus();
        await savePatch({
          push_enabled: false,
          permission_status: newStatus === NOTIFICATION_PERMISSION_STATUS.DENIED
            ? NOTIFICATION_PERMISSION_STATUS.DENIED
            : NOTIFICATION_PERMISSION_STATUS.DEFAULT,
          permission_prompted_at: new Date().toISOString(),
        }, 'push_enabled');

        setPermissionMessage(
          newStatus === NOTIFICATION_PERMISSION_STATUS.DENIED ? 'blocked' : 'denied',
        );
        return { data: null, error: null };
      }

      const result = await savePatch({
        push_enabled: true,
        permission_status: NOTIFICATION_PERMISSION_STATUS.GRANTED,
        permission_prompted_at: new Date().toISOString(),
      }, 'push_enabled');

      if (!result.error) {
        setPermissionMessage('granted');
      }
      return result;
    },
    [disablePushSubscription, getPermissionStatus, preferences.permission_prompted_at, requestPermission, savePatch],
  );

  const setPreference = useCallback(
    (key, value) => savePatch({ [key]: value }, key),
    [savePatch],
  );

  const pushToggleChecked = useMemo(() => {
    if (!isPermissionGranted()) return false;
    return preferences.push_enabled === true;
  }, [isPermissionGranted, permissionRevision, preferences.push_enabled]);

  const status = useMemo(() => ({
    loading,
    savingKey,
    savedKey,
    error,
    permissionMessage,
    pushToggleChecked,
    osPermissionDenied: isPermissionDenied(),
    osPermissionGranted: isPermissionGranted(),
  }), [
    error,
    isPermissionDenied,
    isPermissionGranted,
    loading,
    permissionMessage,
    permissionRevision,
    pushToggleChecked,
    savedKey,
    savingKey,
  ]);

  return {
    preferences,
    setMasterEnabled,
    setPreference,
    status,
    clearPermissionMessage: () => setPermissionMessage(null),
  };
}
