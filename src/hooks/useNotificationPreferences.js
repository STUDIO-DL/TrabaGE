import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  setOneSignalPushEnabled,
  syncOneSignalNotificationTags,
} from '../config/onesignal';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PERMISSION_STATUS,
} from '../constants/notificationPreferences';
import {
  normalizeNotificationPreferences,
  notificationPreferencesService,
} from '../services/notificationPreferences.service';
import { reportError } from '../utils/logger';

export function useNotificationPreferences(userId, { disabled = false } = {}) {
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [error, setError] = useState(null);
  const [permissionMessage, setPermissionMessage] = useState(null);

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

  const setMasterEnabled = useCallback(
    async (enabled) => {
      setPermissionMessage(null);

      if (!enabled) {
        await setOneSignalPushEnabled(false);
        return savePatch({ push_enabled: false }, 'push_enabled');
      }

      const currentStatus = getNotificationPermissionStatus();
      const alreadyDenied = preferences.permission_status === NOTIFICATION_PERMISSION_STATUS.DENIED;
      const alreadyPromptedWithoutGrant = preferences.permission_prompted_at
        && preferences.permission_status !== NOTIFICATION_PERMISSION_STATUS.GRANTED
        && currentStatus !== NOTIFICATION_PERMISSION_STATUS.GRANTED;

      if (alreadyDenied || currentStatus === NOTIFICATION_PERMISSION_STATUS.DENIED || alreadyPromptedWithoutGrant) {
        await savePatch({
          push_enabled: false,
          permission_status: NOTIFICATION_PERMISSION_STATUS.DENIED,
          permission_prompted_at: preferences.permission_prompted_at ?? new Date().toISOString(),
        }, 'push_enabled');
        setPermissionMessage('denied');
        return { data: null, error: null };
      }

      const granted = currentStatus === NOTIFICATION_PERMISSION_STATUS.GRANTED
        ? true
        : await requestNotificationPermission();

      if (!granted) {
        await savePatch({
          push_enabled: false,
          permission_status: getNotificationPermissionStatus() === NOTIFICATION_PERMISSION_STATUS.DENIED
            ? NOTIFICATION_PERMISSION_STATUS.DENIED
            : NOTIFICATION_PERMISSION_STATUS.DEFAULT,
          permission_prompted_at: new Date().toISOString(),
        }, 'push_enabled');
        setPermissionMessage('denied');
        return { data: null, error: null };
      }

      await setOneSignalPushEnabled(true);
      return savePatch({
        push_enabled: true,
        permission_status: NOTIFICATION_PERMISSION_STATUS.GRANTED,
        permission_prompted_at: preferences.permission_prompted_at ?? new Date().toISOString(),
      }, 'push_enabled');
    },
    [preferences, savePatch],
  );

  const setPreference = useCallback(
    (key, value) => savePatch({ [key]: value }, key),
    [savePatch],
  );

  const status = useMemo(() => ({
    loading,
    savingKey,
    savedKey,
    error,
    permissionMessage,
  }), [error, loading, permissionMessage, savedKey, savingKey]);

  return {
    preferences,
    setMasterEnabled,
    setPreference,
    status,
    clearPermissionMessage: () => setPermissionMessage(null),
  };
}
