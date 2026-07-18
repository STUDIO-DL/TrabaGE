import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { isAuthRateLimitError, mapAuthError } from '../utils/errors';
import {
  getSignupCooldownRemainingSeconds,
  markSignupEmailSent,
  normalizeSignupEmail,
  readSignupCooldownDeadline,
  SIGNUP_EMAIL_COOLDOWN_MS,
} from '../utils/signupEmailCooldown';

export default function useEmailVerificationResend(email, initialSentAt = null) {
  const normalizedEmail = useMemo(() => normalizeSignupEmail(email), [email]);
  const [remaining, setRemaining] = useState(() =>
    getSignupCooldownRemainingSeconds(normalizedEmail),
  );
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const syncRemaining = useCallback(() => {
    setRemaining(getSignupCooldownRemainingSeconds(normalizedEmail));
  }, [normalizedEmail]);

  const startCooldown = useCallback(
    (sentAt = Date.now()) => {
      if (!normalizedEmail) return;
      markSignupEmailSent(normalizedEmail, sentAt);
      syncRemaining();
    },
    [normalizedEmail, syncRemaining],
  );

  useEffect(() => {
    if (initialSentAt) startCooldown(initialSentAt);
  }, [initialSentAt, startCooldown]);

  useEffect(() => {
    syncRemaining();
    if (!normalizedEmail) return undefined;

    const timer = window.setInterval(() => {
      syncRemaining();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [normalizedEmail, syncRemaining]);

  const resend = useCallback(async () => {
    if (!normalizedEmail || sending || remaining > 0) return false;

    setSending(true);
    setError('');
    setMessage('');

    const { error: resendError } = await authService.resendSignupConfirmation(normalizedEmail);

    if (resendError) {
      if (isAuthRateLimitError(resendError)) {
        if (!readSignupCooldownDeadline(normalizedEmail)) {
          markSignupEmailSent(normalizedEmail);
        }
        syncRemaining();
        setMessage(
          `Espera ${Math.ceil(SIGNUP_EMAIL_COOLDOWN_MS / 1000)} segundos antes de reenviar el correo.`,
        );
      } else {
        setError(mapAuthError(resendError));
      }
      setSending(false);
      return false;
    }

    startCooldown();
    setMessage('Hemos enviado un nuevo enlace de verificación.');
    setSending(false);
    return true;
  }, [normalizedEmail, remaining, sending, startCooldown, syncRemaining]);

  return {
    resend,
    remaining,
    sending,
    message,
    error,
    canResend: Boolean(normalizedEmail) && !sending && remaining === 0,
  };
}
