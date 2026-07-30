/**
 * Lightweight device / browser hints for push & PWA UX copy.
 * Never expose technical jargon to end users via these helpers alone.
 */

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua);
}

export function isIosSafari() {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent || '';
  // Chrome/Firefox/Edge on iOS include CriOS/FxiOS/EdgiOS.
  if (/crios|fxios|edgios/i.test(ua)) return false;
  return /safari/i.test(ua);
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

/** iOS typically needs Add to Home Screen for reliable web push. */
export function iosNeedsHomeScreenForPush() {
  return isIosSafari() && !isStandalonePwa();
}
