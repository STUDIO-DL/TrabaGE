const listeners = new Set();

/** Notify inbox lists that a conversation was opened / marked read (optimistic UI). */
export function emitConversationRead(conversationId) {
  if (!conversationId) return;
  listeners.forEach((listener) => {
    try {
      listener(conversationId);
    } catch {
      // Ignore listener errors so one bad subscriber cannot block others.
    }
  });
}

export function subscribeConversationRead(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}
