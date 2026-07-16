import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import { clearPreviewMode } from '../../constants/preview';
import {
  authService,
  consumeOAuthIntent,
  discardUnregisteredOAuthSession,
  getGoogleLoginNoAccountMessage,
  isRegisteredTrabaGEAccount,
  OAUTH_INTENTS,
} from '../../services/auth.service';
import { completePostAuthFlow } from '../../services/authFlow';
import { mapAuthError, isExpiredVerificationUserMessage } from '../../utils/errors';
import { getErrorMessage } from '../../utils/i18n';
import { useAuth } from '../../hooks/useAuth';

const MAX_ATTEMPTS = 15;
const RETRY_MS = 300;

function isEmailVerificationFlow(queryParams, hashParams) {
  const type = queryParams.get('type') || hashParams.get('type');
  return type === 'signup' || type === 'email' || type === 'magiclink';
}

function isExpiredLinkError(message) {
  const lower = message.toLowerCase();
  return (
    lower.includes('otp_expired') ||
    lower.includes('token has expired') ||
    lower.includes('link is invalid') ||
    lower.includes('invalid or has expired')
  );
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshAuthState, logout } = useAuth();
  const [error, setError] = useState('');
  const [errorEmail, setErrorEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resolved = false;

    const finish = async () => {
      clearPreviewMode();

      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError =
        queryParams.get('error_description') || hashParams.get('error_description');
      const isPasswordRecovery =
        queryParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
      const emailVerification = isEmailVerificationFlow(queryParams, hashParams);

      if (oauthError) {
        const decoded = decodeURIComponent(oauthError.replace(/\+/g, ' '));
        if (isExpiredLinkError(decoded)) {
          setError(getErrorMessage('expiredVerificationLink'));
        } else {
          setError(mapAuthError({ message: decoded }));
        }
        return;
      }

      const redirectFromSession = async (session, event = null) => {
        if (!session?.user?.id || cancelled || resolved) return false;
        resolved = true;

        if (isPasswordRecovery || event === 'PASSWORD_RECOVERY') {
          await refreshAuthState();
          if (cancelled) return true;
          navigate('/auth/set-password', { replace: true, state: { passwordRecovery: true } });
          return true;
        }

        const oauthIntent = consumeOAuthIntent();

        if (oauthIntent === OAUTH_INTENTS.LOGIN) {
          const registered = await isRegisteredTrabaGEAccount(session.user);
          if (!registered) {
            await discardUnregisteredOAuthSession();
            await logout();
            if (cancelled) return true;
            navigate('/login', {
              replace: true,
              state: {
                googleAccountMissing: true,
                googleAccountMissingMessage: getGoogleLoginNoAccountMessage(),
              },
            });
            return true;
          }
        }

        const {
          error: flowError,
          needsAccountTypeSelection,
          redirectTo,
        } = await completePostAuthFlow(session.user);

        if (flowError) {
          setError(mapAuthError(flowError));
          if (emailVerification && session.user.email) {
            setErrorEmail(session.user.email);
          }
          return true;
        }

        if (needsAccountTypeSelection) {
          if (cancelled) return true;
          if (oauthIntent === OAUTH_INTENTS.LOGIN) {
            await discardUnregisteredOAuthSession();
            await logout();
            navigate('/login', {
              replace: true,
              state: {
                googleAccountMissing: true,
                googleAccountMissingMessage: getGoogleLoginNoAccountMessage(),
              },
            });
            return true;
          }
          navigate('/register', { replace: true, state: { fromOAuth: true } });
          return true;
        }

        await refreshAuthState();

        if (cancelled) return true;
        navigate(redirectTo || '/', { replace: true });
        return true;
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'PASSWORD_RECOVERY' ||
          event === 'USER_UPDATED'
        ) {
          setTimeout(() => {
            void redirectFromSession(session, event);
          }, 0);
        }
      });

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) {
          subscription.unsubscribe();
          return;
        }

        const { data, error: sessionError } = await authService.getSession();
        const session = data?.session;

        if (sessionError) {
          subscription.unsubscribe();
          setError(mapAuthError(sessionError));
          return;
        }

        if (await redirectFromSession(session)) {
          subscription.unsubscribe();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }

      subscription.unsubscribe();

      if (!cancelled) {
        setError(getErrorMessage('authIncomplete'));
      }
    };

    finish();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshAuthState, logout]);

  if (error) {
    const isExpired = isExpiredVerificationUserMessage(error);

    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-10 text-center">
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          {isExpired ? (
            <Link
              to={errorEmail ? '/verify-email' : '/register'}
              state={errorEmail ? { email: errorEmail } : undefined}
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Solicitar nuevo enlace
            </Link>
          ) : null}
          <Link
            to="/login"
            className="text-sm font-semibold text-primary-600 transition hover:text-primary-700"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return <AuthLoadingScreen />;
}
