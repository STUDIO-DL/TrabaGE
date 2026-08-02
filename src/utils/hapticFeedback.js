/**
 * Lightweight haptic feedback for selection gestures (WhatsApp-like).
 * No-ops when Vibration API is unavailable.
 */
export function triggerSelectionHaptic() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(12);
  } catch {
    // Ignore — not all browsers allow vibration without user gesture quirks.
  }
}

export function triggerLightHaptic() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(8);
  } catch {
    // Ignore.
  }
}
