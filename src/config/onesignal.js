import OneSignal from 'react-onesignal';
import { NOTIFICATION_PREFERENCE_FIELDS } from '../constants/notificationPreferences';
import { pushSubscriptionsService } from '../services/pushSubscriptions.service';
import { readViteEnv } from './env';
import { reportError } from '../utils/logger';
import { resolvePushNavigationTarget } from '../utils/pushNavigation';

const PRODUCTION_ORIGIN = 'https://trabage.org';
const DEV_ORIGINS_HINT = 'http://localhost:5173 y http://127.0.0.1:5173';

let initPromise = null;
let initialized = false;
/** Set when init cannot succeed on this origin (e.g. Dashboard domain restriction). */
let initUnavailableReason = null;
let domainRestrictionWarned = false;

const permissionChangeListeners = new Set();

function getCurrentOrigin() {
  if (typeof window === 'undefined') return null;
  return window.location.origin;
}

function isDomainRestrictionError(error) {
  const parts = [
    error?.message,
    error?.reason,
    typeof error === 'string' ? error : null,
    error != null ? String(error) : null,
  ];
  return parts.some((part) => part && /can only be used on/i.test(part));
}

function warnDomainRestrictionOnce(origin) {
  if (domainRestrictionWarned) return;
  domainRestrictionWarned = true;
  console.warn(
    `[TrabaGE] OneSignal no se inicializa en ${origin || 'este origen'}. ` +
      `En OneSignal Dashboard → Settings → Platforms → Web → Allowed Origins, ` +
      `añade ${DEV_ORIGINS_HINT}, o prueba en ${PRODUCTION_ORIGIN}.`,
  );
}

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readOneSignalSubscriptionId() {
  return (
    OneSignal.User?.PushSubscription?.id ??
    OneSignal.User?.pushSubscription?.id ??
    null
  );
}

/**
 * Persist device → user link. Retries briefly: OneSignal often assigns the
 * subscription id a moment after permission / login completes.
 */
async function persistPushSubscription(userId, { attempts = 5, delayMs = 400 } = {}) {
  if (!userId || !initialized) return;

  try {
    let subscriptionId = readOneSignalSubscriptionId();

    for (let i = 0; !subscriptionId && i < attempts - 1; i += 1) {
      await sleep(delayMs * (i + 1));
      subscriptionId = readOneSignalSubscriptionId();
    }

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

function attachOneSignalListeners() {
  try {
    OneSignal.Notifications?.addEventListener?.('permissionChange', (granted) => {
      notifyPermissionChangeListeners();
      if (granted) void syncSubscriptionFromDevice();
    });

    OneSignal.Notifications?.addEventListener?.('click', (event) => {
      const notification = event?.notification;
      const target = resolvePushNavigationTarget({
        type: notification?.additionalData?.type ?? notification?.data?.type ?? null,
        metadata: notification?.additionalData ?? notification?.data ?? {},
        launchUrl: notification?.launchURL ?? notification?.launchUrl ?? notification?.url ?? null,
      }, typeof window !== 'undefined' ? window.location.origin : '');

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

  if (initialized || initUnavailableReason) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Production: one SW (/sw.js) hosts Workbox + OneSignal (via workbox.importScripts).
      // Dev: VitePWA is disabled, so use the standalone OneSignal worker shells.
      const useMergedServiceWorker = import.meta.env.PROD;
      await OneSignal.init({
        appId,
        safari_web_id: readViteEnv(import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID) || undefined,
        serviceWorkerPath: useMergedServiceWorker ? '/sw.js' : '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: useMergedServiceWorker ? undefined : '/OneSignalSDKUpdaterWorker.js',
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
      if (isDomainRestrictionError(error)) {
        initUnavailableReason = 'domain_restriction';
        warnDomainRestrictionOnce(getCurrentOrigin());
        return;
      }
      // Keep initPromise settled so callers do not retry/spam; unexpected failures still report once.
      initUnavailableReason = 'init_failed';
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
