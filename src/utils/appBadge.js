export function syncAppBadge(count) {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;

  const unreadCount = Number(count ?? 0);

  if (unreadCount > 0) {
    void navigator.setAppBadge(unreadCount).catch(() => {});
    return;
  }

  void navigator.clearAppBadge?.().catch(() => {});
}
