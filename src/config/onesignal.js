import OneSignal from 'react-onesignal';

let initialized = false;

export const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || initialized) return;

  await OneSignal.init({
    appId,
    safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID,
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: import.meta.env.DEV,
  });

  initialized = true;
};

export const requestNotificationPermission = async () => {
  if (!initialized) return;
  await OneSignal.Notifications.requestPermission();
};

export const setOneSignalUserId = (userId) => {
  if (!initialized || !userId) return;
  OneSignal.login(userId);
};

export const clearOneSignalUserId = () => {
  if (!initialized) return;
  OneSignal.logout();
};
