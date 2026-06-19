import OneSignal from 'react-onesignal';
import { profileService } from '../services/profile.service';

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
    console.warn('[TrabaGE] OneSignal player id sync failed:', error?.message || error);
  }
}

export const isOneSignalConfigured = () =>
  Boolean(import.meta.env.VITE_ONESIGNAL_APP_ID?.trim());

export const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim();
  if (!appId) return;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId,
        safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID?.trim() || undefined,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
      });
      initialized = true;
    } catch (error) {
      console.warn('[TrabaGE] OneSignal init failed:', error?.message || error);
    }
  })();

  return initPromise;
};

export const requestNotificationPermission = async () => {
  await initOneSignal();
  if (!initialized) return false;

  try {
    const granted = await OneSignal.Notifications.requestPermission();
    const userId = OneSignal.User?.externalId;
    if (granted && userId) {
      await persistOneSignalPlayerId(userId);
    }
    return granted;
  } catch (error) {
    console.warn('[TrabaGE] Notification permission failed:', error?.message || error);
    return false;
  }
};

export const setOneSignalUserId = async (userId) => {
  await initOneSignal();
  if (!initialized || !userId) return;

  try {
    await OneSignal.login(userId);
    await persistOneSignalPlayerId(userId);
  } catch (error) {
    console.warn('[TrabaGE] OneSignal login failed:', error?.message || error);
  }
};

export const clearOneSignalUserId = async () => {
  await initOneSignal();
  if (!initialized) return;

  try {
    await OneSignal.logout();
  } catch (error) {
    console.warn('[TrabaGE] OneSignal logout failed:', error?.message || error);
  }
};
