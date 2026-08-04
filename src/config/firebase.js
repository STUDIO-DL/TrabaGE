import { initializeApp, getApps, getApp } from 'firebase/app';

const FIREBASE_CONFIG_ENDPOINT = '/firebase-config.json';

const REQUIRED_CONFIG_KEYS = [
  'apiKey',
  'projectId',
  'messagingSenderId',
  'appId',
];

let configPromise = null;
let appPromise = null;

function cleanConfigValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeFirebaseConfig(rawConfig) {
  const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  return {
    apiKey: cleanConfigValue(source.apiKey),
    authDomain: cleanConfigValue(source.authDomain),
    projectId: cleanConfigValue(source.projectId),
    storageBucket: cleanConfigValue(source.storageBucket),
    messagingSenderId: cleanConfigValue(source.messagingSenderId),
    appId: cleanConfigValue(source.appId),
  };
}

function hasRequiredFirebaseConfig(config) {
  return REQUIRED_CONFIG_KEYS.every((key) => Boolean(config?.[key]));
}

export async function getFirebaseWebConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      const response = await fetch(FIREBASE_CONFIG_ENDPOINT, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Firebase config HTTP ${response.status}`);
      }

      const config = normalizeFirebaseConfig(await response.json());
      if (!hasRequiredFirebaseConfig(config)) {
        throw new Error('Firebase config incompleta');
      }

      return config;
    })().catch((error) => {
      configPromise = null;
      throw error;
    });
  }

  return configPromise;
}

export async function getFirebaseApp() {
  if (getApps().length > 0) return getApp();

  if (!appPromise) {
    appPromise = getFirebaseWebConfig()
      .then((config) => initializeApp(config))
      .catch((error) => {
        appPromise = null;
        throw error;
      });
  }

  return appPromise;
}
