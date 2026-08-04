import {
  getCurrentFcmToken,
  getBoundFcmUserId,
  isFcmConfigured,
  initFcm,
} from '../config/fcm';
import { reportError } from './logger';

/**
 * DEV / ops diagnostic snapshot for real Web Push (FCM).
 * Never throw; never expose secrets. Safe to show human summaries in UI.
 *
 * @returns {Promise<{
 *   configured: boolean,
 *   permission: string,
 *   permissionGranted: boolean,
 *   fcmToken: string|null,
 *   boundUserId: string|null,
 *   pushActive: boolean|null,
 *   serviceWorkerActive: boolean,
 *   serviceWorkerScript: string|null,
 *   secureContext: boolean,
 *   isLocalhost: boolean,
 *   blockers: string[],
 *   readyForTestPush: boolean,
 * }>}
 */
export async function getPushDiagnostics() {
  const blockers = [];
  const configured = isFcmConfigured();
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  let permission = 'unsupported';
  let permissionGranted = false;
  let fcmToken = null;
  let boundUserId = null;
  let pushActive = null;
  let serviceWorkerActive = false;
  let serviceWorkerScript = null;

  if (!configured) {
    blockers.push('FCM no está configurado (faltan VITE_FIREBASE_* o VITE_FIREBASE_VAPID_KEY).');
  }

  if (typeof window !== 'undefined' && !secureContext && !isLocalhost) {
    blockers.push('El contexto no es seguro (HTTPS requerido fuera de localhost).');
  }

  if (typeof Notification !== 'undefined') {
    permission = Notification.permission;
    permissionGranted = Notification.permission === 'granted';
  } else {
    permission = 'unsupported';
    blockers.push('Este navegador no soporta la API de notificaciones.');
  }

  if (permission === 'denied') {
    blockers.push('El permiso de notificaciones está bloqueado en el sistema.');
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      serviceWorkerActive = Boolean(registration?.active);
      serviceWorkerScript = registration?.active?.scriptURL ?? null;
      if (!serviceWorkerActive) {
        blockers.push('No hay Service Worker activo para el alcance /.');
      }
    } catch (error) {
      reportError(error, { area: 'push_diagnostics_sw' });
      blockers.push('No se pudo leer el Service Worker.');
    }
  } else {
    blockers.push('Service Worker no disponible en este navegador.');
  }

  if (configured) {
    try {
      await initFcm();
      fcmToken = getCurrentFcmToken();
      boundUserId = getBoundFcmUserId();
      pushActive = permissionGranted && Boolean(fcmToken);

      if (!fcmToken) {
        blockers.push('No hay token FCM en este dispositivo.');
      }
      if (!boundUserId) {
        blockers.push('No hay usuario vinculado al token FCM (inicia sesión de nuevo).');
      }
      if (pushActive === false) {
        blockers.push('La suscripción push no está activa.');
      }
    } catch (error) {
      reportError(error, { area: 'push_diagnostics_fcm' });
      blockers.push('No se pudo leer el estado de FCM.');
    }
  }

  const readyForTestPush =
    configured &&
    permissionGranted &&
    Boolean(fcmToken) &&
    Boolean(boundUserId) &&
    pushActive !== false &&
    blockers.length === 0;

  return {
    configured,
    permission,
    permissionGranted,
    fcmToken,
    boundUserId,
    pushActive,
    serviceWorkerActive,
    serviceWorkerScript,
    secureContext,
    isLocalhost,
    blockers,
    readyForTestPush,
  };
}

/** Human-facing first blocker for toasts (never technical). */
export function getPushDiagnosticUserMessage(diagnostics) {
  if (!diagnostics) {
    return 'No se pudo comprobar el estado de las notificaciones push.';
  }
  if (diagnostics.readyForTestPush) return null;
  return (
    diagnostics.blockers[0] ??
    'Activa las notificaciones del sistema e inicia sesión antes de probar el push.'
  );
}
