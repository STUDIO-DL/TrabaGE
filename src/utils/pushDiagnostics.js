import { isWebPushConfigured } from '../config/webPush';
import { reportError } from './logger';

export async function getPushDiagnostics() {
  const blockers = [];
  const configured = isWebPushConfigured();
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  let permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  let endpoint = null; let serviceWorkerActive = false; let serviceWorkerScript = null;
  if (!configured) blockers.push('Web Push no está configurado (falta VITE_WEB_PUSH_VAPID_PUBLIC_KEY).');
  if (!secureContext && !isLocalhost) blockers.push('El contexto no es seguro (HTTPS requerido fuera de localhost).');
  if (permission === 'unsupported') blockers.push('Este navegador no soporta la API de notificaciones.');
  if (permission === 'denied') blockers.push('El permiso de notificaciones está bloqueado en el sistema.');
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    serviceWorkerActive = Boolean(registration?.active); serviceWorkerScript = registration?.active?.scriptURL ?? null;
    const subscription = await registration?.pushManager.getSubscription(); endpoint = subscription?.endpoint ?? null;
    if (!serviceWorkerActive) blockers.push('No hay Service Worker activo para el alcance /.');
    if (configured && !endpoint) blockers.push('No hay una suscripción Web Push en este dispositivo.');
  } catch (error) { reportError(error, { area: 'push_diagnostics_web_push' }); blockers.push('No se pudo leer el estado de Web Push.'); }
  const readyForTestPush = configured && permission === 'granted' && Boolean(endpoint) && blockers.length === 0;
  return { configured, permission, permissionGranted: permission === 'granted', fcmToken: endpoint, boundUserId: endpoint ? 'session' : null, pushActive: Boolean(endpoint), serviceWorkerActive, serviceWorkerScript, secureContext, isLocalhost, blockers, readyForTestPush };
}

export function getPushDiagnosticUserMessage(diagnostics) {
  return diagnostics?.readyForTestPush ? null : (diagnostics?.blockers?.[0] ?? 'Activa las notificaciones del sistema e inicia sesión antes de probar el push.');
}
