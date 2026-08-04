/**
 * Keep feed / discover caches in sync when the signed-in user changes avatar or logo.
 */

const EVENT = 'trabage:profile-media';

export function notifyProfileMediaChanged({ userId, authorAvatar }) {
  if (!userId || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: { userId, authorAvatar: authorAvatar ?? null },
    }),
  );
}

export function subscribeProfileMediaChanged(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => handler?.(event.detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
