import OneSignal from 'react-onesignal';
import { NOTIFICATION_PREFERENCE_FIELDS } from '../constants/notificationPreferences';
import { pushSubscriptionsService } from '../services/pushSubscriptions.service';
import { readViteEnv } from './env';
import { reportError } from '../utils/logger';

let initPromise = null;
let initialized = false;

const permissionChangeListeners = new Set();

function notifyPermissionChangeListeners() {
  permissionChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors during permission sync.
    }
  });
}

export function onPushPermissionChange(listener) {
  permissionChangeListeners.add(listener);
  return () => permissionChangeListeners.delete(listener);
}

async function persistPushSubscription(userId) {
  if (!userId || !initialized) return;

  try {
    const subscriptionId =
      OneSignal.User?.PushSubscription?.id ??
      OneSignal.User?.pushSubscription?.id;

    if (!subscriptionId) return;

    await pushSubscriptionsService.upsert(String(subscriptionId));
  } catch (error) {
    reportError(error, { area: 'onesignal_subscription_sync', userId });
  }
}

async function syncSubscriptionFromDevice(userId) {
  const resolvedUserId = userId ?? OneSignal.User?.externalId;
  if (resolvedUserId) {
    await persistPushSubscription(resolvedUserId);
  }
}

function resolvePushNavigationTarget(rawLink) {
  if (!rawLink || typeof rawLink !== 'string') return null;

  const trimmed = rawLink.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  return appOrigin ? `${appOrigin}${path}` : path;
}

function attachOneSignalListeners() {
  try {
    OneSignal.Notifications?.addEventListener?.('permissionChange', (granted) => {
      notifyPermissionChangeListeners();
      if (granted) void syncSubscriptionFromDevice();
    });

    OneSignal.Notifications?.addEventListener?.('click', (event) => {
      const additionalData =
        event?.notification?.additionalData ??
        event?.notification?.data ??
        event?.notification?.custom?.a ??
        null;
      const launchUrl =
        event?.notification?.launchURL ??
        event?.notification?.launchUrl ??
        event?.notification?.url ??
        null;
      const target =
        resolvePushNavigationTarget(additionalData?.link) ??
        resolvePushNavigationTarget(launchUrl);
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'49d13a'},body:JSON.stringify({sessionId:'49d13a',runId:'pre-fix',hypothesisId:'C',location:'onesignal.js:click',message:'push notification clicked',data:{additionalData,launchUrl,target,postId:additionalData?.post_id??null,type:additionalData?.type??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (target && typeof window !== 'undefined') {
        window.location.assign(target);
      }
    });

    const subscription = OneSignal.User?.PushSubscription ?? OneSignal.User?.pushSubscription;
    subscription?.addEventListener?.('change', () => {
      void syncSubscriptionFromDevice();
    });
  } catch (error) {
    reportError(error, { area: 'onesignal_listeners' });
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
        autoResubscribe: true,
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
      attachOneSignalListeners();
    } catch (error) {
      reportError(error, { area: 'onesignal_init' });
    }
  })();

  return initPromise;
};

async function ensurePushSubscriptionActive() {
  const subscription = OneSignal.User?.PushSubscription ?? OneSignal.User?.pushSubscription;
  if (subscription?.optedIn === false) {
    await subscription.optIn?.();
  }
  void syncSubscriptionFromDevice();
}

export const requestNotificationPermission = async () => {
  await initOneSignal();

  try {
    if (initialized) {
      if (OneSignal.Notifications?.permissionNative === 'denied') {
        return false;
      }

      if (!OneSignal.Notifications?.permission && OneSignal.Notifications?.requestPermission) {
        const granted = await OneSignal.Notifications.requestPermission();
        if (!granted) return false;
      }

      await ensurePushSubscriptionActive();
      return true;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        void syncSubscriptionFromDevice();
        return true;
      }

      if (Notification.permission === 'denied') {
        return false;
      }

      const result = await Notification.requestPermission();
      const granted = result === 'granted';
      if (granted) {
        void syncSubscriptionFromDevice();
      }
      return granted;
    }

    return false;
  } catch (error) {
    reportError(error, { area: 'onesignal_permission' });
    return false;
  }
};

export const getNotificationPermissionStatus = () => {
  if (initialized && OneSignal.Notifications?.permissionNative) {
    return OneSignal.Notifications.permissionNative;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }

  return Notification.permission;
};

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  ('Notification' in window || 'serviceWorker' in navigator);

export const setOneSignalPushEnabled = async (enabled) => {
  await initOneSignal();
  if (!initialized) return;

  try {
    const subscription = OneSignal.User?.PushSubscription ?? OneSignal.User?.pushSubscription;
    if (enabled) {
      await subscription?.optIn?.();
      void syncSubscriptionFromDevice();
    } else {
      await subscription?.optOut?.();
      await pushSubscriptionsService.deactivate();
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

export const setOneSignalUserTags = async ({ role, city, sector } = {}) => {
  await initOneSignal();
  if (!initialized) return;

  const tags = {};
  if (role) tags.role = String(role);
  if (city) tags.city = String(city);
  if (sector) tags.sector = String(sector);

  if (Object.keys(tags).length === 0) return;

  try {
    if (OneSignal.User?.addTags) {
      await OneSignal.User.addTags(tags);
    } else if (OneSignal.sendTags) {
      await OneSignal.sendTags(tags);
    }
  } catch (error) {
    reportError(error, { area: 'onesignal_user_tags', tags });
  }
};

export const setOneSignalUserId = async (userId, profileTags = {}) => {
  await initOneSignal();
  if (!initialized || !userId) return;

  try {
    await OneSignal.login(userId);
    await setOneSignalUserTags(profileTags);
    await persistPushSubscription(userId);
  } catch (error) {
    reportError(error, { area: 'onesignal_login', userId });
  }
};

export const clearOneSignalUserId = async () => {
  await initOneSignal();
  if (!initialized) return;

  try {
    const subscriptionId =
      OneSignal.User?.PushSubscription?.id ??
      OneSignal.User?.pushSubscription?.id;
    if (subscriptionId) {
      await pushSubscriptionsService.deactivate(String(subscriptionId));
    } else {
      await pushSubscriptionsService.deactivate();
    }
    await OneSignal.logout();
  } catch (error) {
    reportError(error, { area: 'onesignal_logout' });
  }
};

export const bindOneSignalUser = async (userId, profileTags = {}) => {
  await initOneSignal();
  if (!userId) return;
  if (getNotificationPermissionStatus() !== 'granted') return;
  await setOneSignalUserId(userId, profileTags);
};

export const attachNotificationClickHandler = () => {
  // Click navigation is handled via OneSignal.Notifications click listener in attachOneSignalListeners.
};
