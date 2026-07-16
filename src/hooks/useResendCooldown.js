import { useCallback, useEffect, useState } from 'react';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Manages a resend-email cooldown with optional persistence across remounts.
 * @param {string} storageKey - localStorage key scoped to the email address
 */
export function useResendCooldown(storageKey) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!storageKey) return undefined;

    const stored = localStorage.getItem(storageKey);
    if (!stored) return undefined;

    const expiresAt = Number(stored);
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    if (remaining > 0) {
      setCooldown(remaining);
    } else {
      localStorage.removeItem(storageKey);
    }

    return undefined;
  }, [storageKey]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const startCooldown = useCallback(() => {
    if (!storageKey) {
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }
    const expiresAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    localStorage.setItem(storageKey, String(expiresAt));
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }, [storageKey]);

  const canResend = cooldown <= 0;

  return { cooldown, canResend, startCooldown, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}
