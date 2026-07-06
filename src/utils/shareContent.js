/**
 * Single source of truth for sharing content across TrabaGE.
 *
 * Primary path: native OS share sheet via the Web Share API (`navigator.share`),
 * which surfaces the user's own installed apps (WhatsApp, Telegram, Instagram,
 * Gmail, Messages, Discord, LinkedIn, AirDrop, Nearby Share, ...).
 *
 * Fallback (mostly desktop browsers): copy the link to the clipboard and show an
 * elegant toast. Never resurrect a fixed social-button list as the main UX.
 */

export const COPY_SUCCESS_MESSAGE = 'Enlace copiado correctamente.';
export const COPY_ERROR_MESSAGE = 'No se pudo copiar el enlace.';

/** Short, human descriptions per content type used as the shared message body. */
export const SHARE_DESCRIPTIONS = {
  job: 'Encontré esta oferta de empleo en TrabaGE.',
  post: 'Mira esta publicación en TrabaGE.',
  profile: 'Mira este perfil en TrabaGE.',
  company: 'Descubre esta empresa en TrabaGE.',
  default: 'Descubre esto en TrabaGE.',
};

export function getShareDescription(type) {
  return SHARE_DESCRIPTIONS[type] || SHARE_DESCRIPTIONS.default;
}

function canUseWebShare(shareData) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare === 'function') {
    try {
      return navigator.canShare(shareData);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Copy text to the clipboard with a graceful legacy fallback.
 * @returns {Promise<boolean>} whether the copy succeeded.
 */
export async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path below
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copy a link and report the result through the provided toast callback.
 * @returns {Promise<boolean>} whether the copy succeeded.
 */
export async function copyLink(url, showToast) {
  const ok = await copyToClipboard(url);
  showToast?.(ok ? COPY_SUCCESS_MESSAGE : COPY_ERROR_MESSAGE, ok ? 'success' : 'error');
  return ok;
}

/**
 * Share content using the native OS share sheet when available, otherwise copy
 * the link to the clipboard.
 *
 * @param {Object} params
 * @param {string} params.title - Short title (e.g. job title, author name).
 * @param {string} [params.text] - Short description conveyed even when a target only reads `text`.
 * @param {string} params.url - Public shareable URL.
 * @param {(message: string, type?: string) => void} [params.showToast] - Toast callback for the fallback.
 * @returns {Promise<{status: 'shared' | 'cancelled' | 'copied' | 'error'}>}
 */
export async function shareContent({ title, text, url, showToast }) {
  const shareData = { title, text, url };

  if (canUseWebShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { status: 'shared' };
    } catch (error) {
      // User dismissed the native sheet — this is not an error.
      if (error && error.name === 'AbortError') {
        return { status: 'cancelled' };
      }
      // Any other failure gracefully degrades to the copy-link fallback.
    }
  }

  const ok = await copyLink(url, showToast);
  return { status: ok ? 'copied' : 'error' };
}
