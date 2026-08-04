/**
 * Central user-facing error system for TrabaGE.
 * Technical errors stay for logging/Sentry; users only see human Spanish messages.
 */

import { mapAuthError } from './errors';
import { reportError } from './logger';
import { reportServerUnreachable } from './connectivity';

/** Contextual actions → preferred user message (when no stronger type wins). */
export const ERROR_ACTION = {
  generic: 'generic',
  load: 'load',
  save: 'save',
  save_profile: 'save_profile',
  save_education: 'save_education',
  save_experience: 'save_experience',
  save_certification: 'save_certification',
  save_skill: 'save_skill',
  save_language: 'save_language',
  save_project: 'save_project',
  save_service: 'save_service',
  upload: 'upload',
  upload_image: 'upload_image',
  upload_cv: 'upload_cv',
  upload_certificate: 'upload_certificate',
  generate_cv: 'generate_cv',
  send_message: 'send_message',
  open_conversation: 'open_conversation',
  load_messages: 'load_messages',
  publish_post: 'publish_post',
  load_feed: 'load_feed',
  load_post: 'load_post',
  publish_job: 'publish_job',
  apply_job: 'apply_job',
  load_jobs: 'load_jobs',
  load_notifications: 'load_notifications',
  search: 'search',
  discover: 'discover',
  follow: 'follow',
  delete: 'delete',
  settings: 'settings',
  verification: 'verification',
  auth: 'auth',
  analytics: 'analytics',
};

const ACTION_MESSAGES = {
  [ERROR_ACTION.generic]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.load]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.save]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.save_profile]:
    'No hemos podido guardar los cambios de tu perfil. Inténtalo nuevamente.',
  [ERROR_ACTION.save_education]: 'No hemos podido guardar tu formación. Inténtalo nuevamente.',
  [ERROR_ACTION.save_experience]: 'No hemos podido guardar tu experiencia. Inténtalo nuevamente.',
  [ERROR_ACTION.save_certification]:
    'No hemos podido guardar tu certificación. Inténtalo nuevamente.',
  [ERROR_ACTION.save_skill]: 'No hemos podido guardar tus habilidades. Inténtalo nuevamente.',
  [ERROR_ACTION.save_language]: 'No hemos podido guardar tus idiomas. Inténtalo nuevamente.',
  [ERROR_ACTION.save_project]: 'No hemos podido guardar tu proyecto. Inténtalo nuevamente.',
  [ERROR_ACTION.save_service]: 'No hemos podido guardar tu servicio. Inténtalo nuevamente.',
  [ERROR_ACTION.upload]: 'No hemos podido subir el archivo. Inténtalo nuevamente.',
  [ERROR_ACTION.upload_image]:
    'No hemos podido subir la imagen. Comprueba el archivo e inténtalo nuevamente.',
  [ERROR_ACTION.upload_cv]: 'No hemos podido subir tu CV. Inténtalo nuevamente.',
  [ERROR_ACTION.upload_certificate]:
    'No hemos podido subir el certificado. Inténtalo nuevamente.',
  [ERROR_ACTION.generate_cv]:
    'No hemos podido generar tu CV en este momento. Inténtalo nuevamente.',
  [ERROR_ACTION.send_message]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.open_conversation]:
    'No hemos podido abrir la conversación. Inténtalo nuevamente.',
  [ERROR_ACTION.load_messages]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.publish_post]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.load_feed]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.load_post]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.publish_job]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.apply_job]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.load_jobs]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.load_notifications]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.search]:
    'No hemos podido realizar la búsqueda. Revisa tu conexión y vuelve a intentarlo.',
  [ERROR_ACTION.discover]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  [ERROR_ACTION.follow]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.delete]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.settings]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.verification]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.auth]: 'No se pudo completar la acción. Inténtalo nuevamente.',
  [ERROR_ACTION.analytics]:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
};

const TYPE_MESSAGES = {
  network:
    'No hemos podido conectarnos en este momento. Comprueba tu conexión a Internet e inténtalo nuevamente.',
  offline: 'Sin conexión a Internet. Revisa tu conexión y vuelve a intentarlo.',
  session: 'Tu sesión ha terminado. Vuelve a iniciar sesión para continuar.',
  permission: 'No tienes permiso para realizar esta acción.',
  not_found: 'No hemos podido encontrar lo que buscas.',
  conflict: 'Esa información ya existe. Revisa los datos e inténtalo nuevamente.',
  validation: 'Revisa la información e inténtalo nuevamente.',
  upload: 'No hemos podido subir el archivo. Comprueba el formato y vuelve a intentarlo.',
  file_too_large: 'Este archivo es demasiado grande.',
  file_type: 'Este formato de archivo no es compatible.',
  server:
    'No hemos podido cargar esta información por el momento. Inténtalo nuevamente en unos minutos.',
  rate_limit: 'Has realizado demasiados intentos. Espera un momento e inténtalo nuevamente.',
  unexpected: 'Ha ocurrido un problema temporal. Inténtalo nuevamente en unos momentos.',
};

const TECHNICAL_PATTERNS = [
  /\btypeerror\b/i,
  /\breferenceerror\b/i,
  /\bsyntaxerror\b/i,
  /\bcannot read propert/i,
  /\bundefined is not\b/i,
  /\bis not a function\b/i,
  /\bnull is not\b/i,
  /\bfailed to fetch\b/i,
  /\bunable to fetch\b/i,
  /\bnetworkerror\b/i,
  /\bnetwork request failed\b/i,
  /\binternal server error\b/i,
  /\bbad gateway\b/i,
  /\bservice unavailable\b/i,
  /\bgateway timeout\b/i,
  /\bstatus code\b/i,
  /\bhttp\s*[/=]?\s*\d{3}\b/i,
  /\berror\s*(401|403|404|429|500)\b/i,
  /\b\d{3}\s+(internal|bad|forbidden|unauthorized|not found)\b/i,
  /\bsupabase\b/i,
  /\bpostgrest\b/i,
  /\bpostgres\b/i,
  /\bpostgresql\b/i,
  /\bfirebase\b/i,
  /\bresend\b/i,
  /\bfcm\b/i,
  /\bfirebase\b/i,
  /\bwebassembly\b/i,
  /\bwasm\b/i,
  /\bdataview\b/i,
  /\barraybuffer\b/i,
  /\bstack trace\b/i,
  /\bunhandled (promise|exception)\b/i,
  /\bpromise rejected\b/i,
  /\bexception\b/i,
  /\brls\b/i,
  /\brow-level security\b/i,
  /\brpc\b/i,
  /\bcsp\b/i,
  /\bjwt\b/i,
  /\bpgrst\b/i,
  /\bviolates\b/i,
  /\bpermission denied\b/i,
  /\bduplicate key\b/i,
  /\bforeign key\b/i,
  /\bcheck constraint\b/i,
  /\binvalid input syntax\b/i,
  /\brelation .* does not exist\b/i,
  /\bcolumn .* does not exist\b/i,
  /\bfunction .* does not exist\b/i,
  /\bcannot coerce\b/i,
  /\bjson object requested\b/i,
  /\bcolumn reference\b/i,
  /\bbucket\b/i,
  /\bstorage\b/i,
  /\boffset is outside the bounds\b/i,
  /\bat\s+[\w$.]+\s+\(/i,
  /\.js:\d+/i,
  /\.jsx:\d+/i,
  /\{.*"(code|details|hint|message)".*\}/i,
  /^(undefined|null|nan|\[object object\])$/i,
];

const KNOWN_FRIENDLY_HINTS = [
  /^no hemos podido/i,
  /^no se pudo/i,
  /^no se pueden/i,
  /^ha ocurrido/i,
  /^algo (no ha|salió|salio)/i,
  /^tu sesión/i,
  /^comprueba/i,
  /^introduce/i,
  /^este (campo|archivo|formato)/i,
  /^la contraseña/i,
  /^el (correo|archivo|enlace)/i,
  /^revisa /i,
  /^espera /i,
  /^has realizado/i,
  /^todavía no/i,
  /^sin conexión/i,
  /^correo o contraseña/i,
  /^demasiados intentos/i,
  /^cuenta (desactivada|inexistente|suspendida)/i,
  /^no tienes (permiso|permisos|notificaciones)/i,
  /^no encontramos/i,
  /^esa (información|dato)/i,
  /^ese dato/i,
  /^selecciona /i,
  /^acepta /i,
  /^confirma /i,
  /^añade /i,
  /^nombre de usuario/i,
  /^estamos trabajando/i,
];

function createErrorId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `err_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `err_${Date.now().toString(36)}`;
}

function readMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return String(error.message || error.error_description || error.msg || '');
}

function readCode(error) {
  if (!error || typeof error === 'string') return '';
  return String(error.code || error.error || error.name || '').toLowerCase();
}

function readStatus(error) {
  if (!error || typeof error === 'string') return 0;
  return Number(error.status || error.statusCode || error.status_code || 0) || 0;
}

export function looksTechnical(message) {
  const text = String(message || '').trim();
  if (!text) return true;
  if (TECHNICAL_PATTERNS.some((re) => re.test(text))) return true;
  if (/^[a-z0-9_.:\-/\s]+$/i.test(text) && /[_]|error|fail|invalid|denied/i.test(text)) {
    if (!KNOWN_FRIENDLY_HINTS.some((re) => re.test(text))) return true;
  }
  return false;
}

export function isFriendlyUserMessage(message) {
  const text = String(message || '').trim();
  if (!text || looksTechnical(text)) return false;
  if (KNOWN_FRIENDLY_HINTS.some((re) => re.test(text))) return true;
  return (
    /[áéíóúñ¿¡]/i.test(text) ||
    /\b(inténtalo|intentalo|comprueba|guardar|cargar|subir)\b/i.test(text)
  );
}

function classifyError(error) {
  const message = readMessage(error).toLowerCase();
  const code = readCode(error);
  const status = readStatus(error);
  const name = String(error?.name || '').toLowerCase();

  if (
    typeof navigator !== 'undefined' &&
    navigator.onLine === false &&
    (message.includes('fetch') || message.includes('network') || !message)
  ) {
    return 'offline';
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('unable to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    code === 'network_error' ||
    (name === 'typeerror' && message.includes('fetch'))
  ) {
    return 'network';
  }

  if (
    status === 401 ||
    code === 'session_expired' ||
    message.includes('jwt') ||
    message.includes('session missing') ||
    message.includes('auth session missing') ||
    message.includes('refresh_token') ||
    message.includes('not authenticated')
  ) {
    return 'session';
  }

  if (
    status === 403 ||
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('not authorized') ||
    message.includes('forbidden')
  ) {
    return 'permission';
  }

  if (status === 404 || code === 'pgrst116') {
    return 'not_found';
  }

  if (
    status === 409 ||
    code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('already exists')
  ) {
    return 'conflict';
  }

  if (
    status === 413 ||
    message.includes('too large') ||
    message.includes('payload too large') ||
    message.includes('maximum allowed size') ||
    code === 'file_too_large'
  ) {
    return 'file_too_large';
  }

  if (
    message.includes('mime') ||
    message.includes('file type') ||
    message.includes('invalid file') ||
    message.includes('unsupported format') ||
    code === 'invalid_file_type'
  ) {
    return 'file_type';
  }

  if (
    message.includes('storage') ||
    message.includes('bucket') ||
    message.includes('upload failed') ||
    code.startsWith('storage')
  ) {
    return 'upload';
  }

  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'rate_limit';
  }

  if (status >= 500) {
    return 'server';
  }

  if (
    message.includes('wasm') ||
    message.includes('webassembly') ||
    message.includes('dataview') ||
    message.includes('arraybuffer') ||
    message.includes('offset is outside')
  ) {
    return 'unexpected';
  }

  if (
    code === 'invalid_credentials' ||
    code === 'email_not_confirmed' ||
    code === 'user_already_registered' ||
    code === 'weak_password' ||
    message.includes('invalid login credentials') ||
    message.includes('email not confirmed')
  ) {
    return 'auth';
  }

  if (
    code === '22p02' ||
    code === '23514' ||
    message.includes('check constraint') ||
    message.includes('invalid input syntax')
  ) {
    return 'validation';
  }

  return 'unexpected';
}

function resolveActionKey(action) {
  if (!action) return null;
  if (ACTION_MESSAGES[action]) return action;
  return null;
}

/**
 * @param {unknown} error
 * @param {{ action?: string, fallback?: string, log?: boolean, context?: object } | string} [options]
 */
export function toUserFacingError(error, options = {}) {
  const normalized = typeof options === 'string' ? { action: options } : options || {};
  const { action = null, fallback = null, log = false, context = {} } = normalized;

  const errorId = error?.errorId || createErrorId();
  const type = classifyError(error);
  const rawMessage = readMessage(error);
  const actionKey = resolveActionKey(action);

  let message;

  if (type === 'auth' || actionKey === ERROR_ACTION.auth) {
    message = mapAuthError(error);
  } else if (type === 'network' || type === 'offline') {
    message = TYPE_MESSAGES[type];
  } else if (type === 'session') {
    message = TYPE_MESSAGES.session;
  } else if (type === 'permission') {
    message = TYPE_MESSAGES.permission;
  } else if (type === 'file_too_large' || type === 'file_type') {
    message = TYPE_MESSAGES[type];
  } else if (type === 'rate_limit') {
    message = TYPE_MESSAGES.rate_limit;
  } else if (type === 'server') {
    message = fallback || (actionKey && ACTION_MESSAGES[actionKey]) || TYPE_MESSAGES.server;
  } else if (isFriendlyUserMessage(rawMessage) && !fallback) {
    message = rawMessage.trim();
  } else if (fallback && isFriendlyUserMessage(fallback)) {
    message = fallback;
  } else if (actionKey) {
    message = ACTION_MESSAGES[actionKey];
  } else if (TYPE_MESSAGES[type]) {
    message = TYPE_MESSAGES[type];
  } else {
    message = TYPE_MESSAGES.unexpected;
  }

  if (!message || looksTechnical(message)) {
    message =
      (fallback && isFriendlyUserMessage(fallback) && fallback) ||
      (actionKey && ACTION_MESSAGES[actionKey]) ||
      TYPE_MESSAGES.unexpected;
  }

  const technical = {
    errorId,
    type,
    action: actionKey,
    name: error?.name || null,
    code: readCode(error) || null,
    status: readStatus(error) || null,
    message: rawMessage || null,
    stack: error?.stack || null,
  };

  if (log) {
    reportError(error instanceof Error ? error : new Error(rawMessage || type), {
      ...context,
      area: context.area || 'user_facing_error',
      errorId,
      errorType: type,
      action: actionKey,
      userMessage: message,
    });
  }

  if (type === 'network' || type === 'offline') {
    reportServerUnreachable();
  }

  return { message, type, errorId, technical };
}

export function getUserErrorMessage(error, actionOrOptions) {
  return toUserFacingError(error, actionOrOptions).message;
}

/** Wrap so `.message` is always user-safe; keeps originals for logging. */
export function asUserFacingError(error, actionOrOptions) {
  if (!error) return null;
  const mapped = toUserFacingError(error, actionOrOptions);
  return {
    ...error,
    message: mapped.message,
    errorId: mapped.errorId,
    errorType: mapped.type,
    technicalMessage: readMessage(error),
  };
}

export function getActionMessage(action) {
  return ACTION_MESSAGES[action] || ACTION_MESSAGES[ERROR_ACTION.generic];
}
