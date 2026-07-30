import OneSignal from 'react-onesignal';
import { isOneSignalConfigured, initOneSignal } from '../config/onesignal';
import { reportError } from './logger';

/**
 * DEV / ops diagnostic snapshot for real Web Push (OneSignal).
 * Never throw; never expose secrets. Safe to show human summaries in UI.
 *
 * @returns {Promise<{
 *   configured: boolean,
 *   permission: string,
 *   permissionGranted: boolean,
 *   subscriptionId: string|null,
 *   externalId: string|null,
 *   optedIn: boolean|null,
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
  const configured = isOneSignalConfigured();
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  let permission = 'unsupported';
  let permissionGranted = false;
  let subscriptionId = null;
  let externalId = null;
  let optedIn = null;
  let serviceWorkerActive = false;
  let serviceWorkerScript = null;

  if (!configured) {
    blockers.push('OneSignal no está configurado (falta VITE_ONESIGNAL_APP_ID).');
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
      await initOneSignal();
      subscriptionId =
        OneSignal.User?.PushSubscription?.id ??
        OneSignal.User?.pushSubscription?.id ??
        null;
      externalId = OneSignal.User?.externalId ?? null;
      const subscription = OneSignal.User?.PushSubscription ?? OneSignal.User?.pushSubscription;
      optedIn = typeof subscription?.optedIn === 'boolean' ? subscription.optedIn : null;

      if (!subscriptionId) {
        blockers.push('No hay suscripción OneSignal en este dispositivo.');
      }
      if (!externalId) {
        blockers.push('OneSignal no tiene external_id (inicia sesión de nuevo).');
      }
      if (optedIn === false) {
        blockers.push('La suscripción push no está opted-in.');
      }
    } catch (error) {
      reportError(error, { area: 'push_diagnostics_onesignal' });
      blockers.push('No se pudo leer el estado de OneSignal.');
    }
  }

  const readyForTestPush =
    configured &&
    permissionGranted &&
    Boolean(subscriptionId) &&
    Boolean(externalId) &&
    optedIn !== false &&
    blockers.length === 0;

  return {
    configured,
    permission,
    permissionGranted,
    subscriptionId,
    externalId,
    optedIn,
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
