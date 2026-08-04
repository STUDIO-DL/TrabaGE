import { initializeApp, getApps, getApp } from 'firebase/app';
import { readViteEnv } from './env';

export function getFirebaseWebConfig() {
  return {
    apiKey: readViteEnv(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: readViteEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: readViteEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: readViteEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: readViteEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: readViteEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  };
}

export function isFirebaseConfigured() {
  const config = getFirebaseWebConfig();
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId,
  );
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (getApps().length > 0) return getApp();
  return initializeApp(getFirebaseWebConfig());
}
