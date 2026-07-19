import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { AuthConfirmSkeleton } from '../../components/common/Skeleton';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { completePostAuthFlow } from '../../services/authFlow';
import { queueWelcomeEmailOnRegistrationComplete } from '../../services/welcomeEmail.service';
import { isExpiredVerificationUserMessage, mapAuthError } from '../../utils/errors';
import { getErrorMessage } from '../../utils/i18n';
import { clearPendingSignupEmail } from '../../utils/signupEmailCooldown';

const PENDING_EMAIL_KEY = 'trabage_pending_verification_email';

function readPendingVerificationEmail() {
  try {
    return String(sessionStorage.getItem(PENDING_EMAIL_KEY) || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export default function AuthConfirm() {
  const navigate = useNavigate();
  const { refreshAuthState } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState(readPendingVerificationEmail);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let redirectTimer;

    const finishSuccess = async (redirectTo, wasAlreadyVerified = false) => {
      setAlreadyVerified(wasAlreadyVerified);
      setStatus('success');
      redirectTimer = window.setTimeout(() => {
        navigate(redirectTo || '/', { replace: true });
      }, wasAlreadyVerified ? 600 : 1200);
    };

    const confirm = async () => {
      const {
        data,
        error: confirmationError,
        alreadyVerified: wasAlreadyVerified,
      } = await authService.confirmEmailFromUrl();

      if (cancelled) return;

      const confirmedEmail = data?.user?.email ?? data?.session?.user?.email ?? '';
      if (confirmedEmail) {
        setPendingEmail(confirmedEmail.trim().toLowerCase());
        clearPendingSignupEmail(confirmedEmail);
      }

      if (confirmationError) {
        setError(mapAuthError(confirmationError));
        setStatus('error');
        return;
      }

      await refreshAuthState();

      const user = data?.user ?? data?.session?.user;
      const { error: flowError, needsAccountTypeSelection, redirectTo } =
        await completePostAuthFlow(user, { preferProfile: true });

      if (cancelled) return;

      if (flowError) {
        setError(mapAuthError(flowError));
        setStatus('error');
        return;
      }

      if (needsAccountTypeSelection) {
        navigate('/register', { replace: true, state: { fromEmailVerification: true } });
        return;
      }

      if (!wasAlreadyVerified) {
        await queueWelcomeEmailOnRegistrationComplete();
      }

      await refreshAuthState();
      await finishSuccess(redirectTo, wasAlreadyVerified);
    };

    void confirm();

    return () => {
      cancelled = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [navigate, refreshAuthState]);

  const isExpired = isExpiredVerificationUserMessage(error);
  const resendEmail = pendingEmail;

  return (
    <main className="min-h-dvh bg-app-bg px-5 py-10 text-app-text">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col items-center justify-center text-center">
        <TrabaGEWordmark className="h-10 w-auto" />

        <section className="mt-8 w-full rounded-3xl border border-app-border bg-app-card p-7 shadow-elevation-3">
          {status === 'loading' ? (
            <>
              <AuthConfirmSkeleton />
              <h1 className="mt-5 text-xl font-bold">Verificando tu correo</h1>
              <p className="mt-2 text-sm text-app-muted">
                Estamos validando el enlace de confirmación. No cierres esta ventana.
              </p>
            </>
          ) : null}

          {status === 'success' ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" aria-hidden />
              <h1 className="mt-5 text-xl font-bold">
                {alreadyVerified ? 'Correo ya verificado' : 'Correo verificado'}
              </h1>
              <p className="mt-2 text-sm text-app-muted">
                {alreadyVerified
                  ? getErrorMessage('emailAlreadyVerified')
                  : 'Tu cuenta está lista. Entrando en TrabaGE…'}
              </p>
            </>
          ) : null}

          {status === 'error' ? (
            <>
              <CircleAlert className="mx-auto h-14 w-14 text-red-600" aria-hidden />
              <h1 className="mt-5 text-xl font-bold">
                {isExpired ? 'Enlace expirado' : 'No pudimos verificar el correo'}
              </h1>
              <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error || 'El enlace es inválido o ha expirado.'}
              </p>
              <div className="mt-6 flex w-full flex-col gap-3">
                <Link
                  to={resendEmail ? '/verify-email' : '/register'}
                  state={resendEmail ? { email: resendEmail } : undefined}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  {isExpired || resendEmail ? 'Solicitar nuevo enlace' : 'Volver al registro'}
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-primary-600 transition hover:text-primary-700"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
