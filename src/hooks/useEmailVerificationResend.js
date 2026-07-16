import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { mapAuthError } from '../utils/errors';

const COOLDOWN_SECONDS = 60;
const STORAGE_PREFIX = 'trabage_email_confirmation_cooldown:';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function storageKey(email) {
  return `${STORAGE_PREFIX}${encodeURIComponent(normalizeEmail(email))}`;
}

function getRemainingSeconds(email) {
  if (!normalizeEmail(email)) return 0;
  const deadline = Number(localStorage.getItem(storageKey(email)) || 0);
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export default function useEmailVerificationResend(email, initialSentAt = null) {
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(normalizedEmail));
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const startCooldown = useCallback((sentAt = Date.now()) => {
    if (!normalizedEmail) return;
    const deadline = sentAt + COOLDOWN_SECONDS * 1000;
    localStorage.setItem(storageKey(normalizedEmail), String(deadline));
    setRemaining(getRemainingSeconds(normalizedEmail));
  }, [normalizedEmail]);

  useEffect(() => {
    if (initialSentAt) startCooldown(initialSentAt);
  }, [initialSentAt, startCooldown]);

  useEffect(() => {
    setRemaining(getRemainingSeconds(normalizedEmail));
    if (!normalizedEmail) return undefined;

    const timer = window.setInterval(() => {
      const next = getRemainingSeconds(normalizedEmail);
      setRemaining(next);
      if (next === 0) localStorage.removeItem(storageKey(normalizedEmail));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [normalizedEmail]);

  const resend = useCallback(async () => {
    if (!normalizedEmail || sending || remaining > 0) return false;

    setSending(true);
    setError('');
    setMessage('');

    const { error: resendError } =
      await authService.resendSignupConfirmation(normalizedEmail);

    if (resendError) {
      setError(mapAuthError(resendError));
      setSending(false);
      return false;
    }

    startCooldown();
    setMessage('Hemos enviado un nuevo enlace de verificación.');
    setSending(false);
    return true;
  }, [normalizedEmail, remaining, sending, startCooldown]);

  return {
    resend,
    remaining,
    sending,
    message,
    error,
    canResend: Boolean(normalizedEmail) && !sending && remaining === 0,
  };
}
