import OneSignal from 'react-onesignal';
import { NOTIFICATION_PREFERENCE_FIELDS } from '../constants/notificationPreferences';
import { profileService } from '../services/profile.service';
import { readViteEnv } from './env';
import { reportError } from '../utils/logger';

let initPromise = null;
let initialized = false;

async function persistOneSignalPlayerId(userId) {
  if (!userId || !initialized) return;

  try {
    const subscriptionId =
      OneSignal.User?.PushSubscription?.id ??
      OneSignal.User?.pushSubscription?.id ??
      OneSignal.User?.onesignalId;

    if (!subscriptionId) return;

    await profileService.updateOneSignalPlayerId(userId, String(subscriptionId));
  } catch (error) {
    reportError(error, { area: 'onesignal_player_sync', userId });
  }
}

export const isOneSignalConfigured = () =>
  Boolean(readViteEnv(import.meta.env.VITE_ONESIGNAL_APP_ID));

export const initOneSignal = async () => {
  const appId = readViteEnv(import.meta.env.VITE_ONESIGNAL_APP_ID);
  if (!appId) return;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId,
        safari_web_id: readViteEnv(import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID) || undefined,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: 'push',
                autoPrompt: false,
                text: {
                  actionMessage:
                    '¿Quieres recibir avisos de TrabaGE? Te notificamos sobre ofertas, postulaciones y novedades de empresas que sigues.',
                  acceptButton: 'Sí, activar',
                  cancelButton: 'Ahora no',
                },
              },
            ],
          },
        },
        welcomeNotification: {
          title: 'TrabaGE',
          message: '¡Listo! Te avisaremos cuando surjan nuevas oportunidades para ti.',
        },
      });
      initialized = true;
    } catch (error) {
      reportError(error, { area: 'onesignal_init' });
    }
  })();

  return initPromise;
};

export const requestNotificationPermission = async () => {
  await initOneSignal();
  if (!initialized) return false;

  try {
    if (OneSignal.Notifications?.permission) {
      const userId = OneSignal.User?.externalId;
      if (userId) await persistOneSignalPlayerId(userId);
      return true;
    }

    const syncOnGrant = async () => {
      const userId = OneSignal.User?.externalId;
      if (userId) await persistOneSignalPlayerId(userId);
    };
    OneSignal.Notifications?.addEventListener?.('permissionChange', (granted) => {
      if (granted) void syncOnGrant();
    });

    const granted = await OneSignal.Notifications?.requestPermission?.();
    if (granted) await syncOnGrant();
    if (typeof granted === 'boolean') return granted;

    if (OneSignal.Slidedown?.promptPush) {
      await OneSignal.Slidedown.promptPush({ force: false });
      return Boolean(OneSignal.Notifications?.permission);
    }

    return false;
  } catch (error) {
    reportError(error, { area: 'onesignal_permission' });
    return false;
  }
};

export const getNotificationPermissionStatus = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }

  return Notification.permission;
};

export const setOneSignalPushEnabled = async (enabled) => {
  await initOneSignal();
  if (!initialized) return;

  try {
    const subscription = OneSignal.User?.PushSubscription ?? OneSignal.User?.pushSubscription;
    if (enabled) {
      await subscription?.optIn?.();
    } else {
      await subscription?.optOut?.();
    }
  } catch (error) {
    reportError(error, { area: 'onesignal_push_subscription_toggle', enabled });
  }
};

export const syncOneSignalNotificationTags = async (preferences) => {
  await initOneSignal();
  if (!initialized || !preferences) return;

  const tags = NOTIFICATION_PREFERENCE_FIELDS.reduce((acc, key) => {
    acc[`pref_${key}`] = preferences[key] === true ? 'true' : 'false';
    return acc;
  }, {});

  tags.pref_push_enabled = preferences.push_enabled === true ? 'true' : 'false';

  try {
    if (OneSignal.User?.addTags) {
      await OneSignal.User.addTags(tags);
      return;
    }

    if (OneSignal.sendTags) {
      await OneSignal.sendTags(tags);
    }
  } catch (error) {
    reportError(error, { area: 'onesignal_preference_tags_sync' });
  }
};

export const setOneSignalUserId = async (userId) => {
  await initOneSignal();
  if (!initialized || !userId) return;

  try {
    await OneSignal.login(userId);
    await persistOneSignalPlayerId(userId);
  } catch (error) {
    reportError(error, { area: 'onesignal_login', userId });
  }
};

export const clearOneSignalUserId = async () => {
  await initOneSignal();
  if (!initialized) return;

  try {
    await OneSignal.logout();
  } catch (error) {
    reportError(error, { area: 'onesignal_logout' });
  }
};
