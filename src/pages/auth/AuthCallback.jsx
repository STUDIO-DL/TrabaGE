import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import Spinner from '../../components/ui/Spinner';
import { clearPreviewMode } from '../../constants/preview';
import {
  authService,
  consumeOAuthIntent,
  discardUnregisteredOAuthSession,
  GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE,
  isRegisteredTrabaGEAccount,
  OAUTH_INTENTS,
} from '../../services/auth.service';
import { completePostAuthFlow } from '../../services/authFlow';
import { mapAuthError } from '../../utils/errors';
import { useAuth } from '../../hooks/useAuth';

const MAX_ATTEMPTS = 15;
const RETRY_MS = 300;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshAuthState, logout } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resolved = false;

    const finish = async () => {
      clearPreviewMode();

      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError = queryParams.get('error_description') || hashParams.get('error_description');
      const isPasswordRecovery =
        queryParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
      if (oauthError) {
        setError(mapAuthError({ message: decodeURIComponent(oauthError.replace(/\+/g, ' ')) }));
        return;
      }

      const redirectFromSession = async (session, event = null) => {
        if (!session?.user?.id || cancelled || resolved) return false;
        // Claim the resolution up front so the onAuthStateChange handler and
        // the polling loop can't both run completePostAuthFlow / navigate.
        resolved = true;

        if (isPasswordRecovery || event === 'PASSWORD_RECOVERY') {
          await refreshAuthState();
          if (cancelled) return true;
          navigate('/auth/set-password', { replace: true, state: { passwordRecovery: true } });
          return true;
        }

        const oauthIntent = consumeOAuthIntent();

        // CASO 1 — Iniciar sesión con Google: never create an account.
        // Supabase OAuth inserts auth.users for unknown Google emails; we detect
        // that orphan and discard it before any profile bootstrap.
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
                googleAccountMissingMessage: GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE,
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
          return true;
        }

        // Signup safety net only: OAuth without a pending account type.
        // Login of an unregistered user never reaches here (handled above).
        if (needsAccountTypeSelection) {
          if (cancelled) return true;
          if (oauthIntent === OAUTH_INTENTS.LOGIN) {
            await discardUnregisteredOAuthSession();
            await logout();
            navigate('/login', {
              replace: true,
              state: {
                googleAccountMissing: true,
                googleAccountMissingMessage: GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE,
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
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY') {
          // Defer Supabase calls to avoid auth client deadlock with AuthContext.
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
        setError('No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.');
      }
    };

    finish();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshAuthState, logout]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-10 text-center">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
        <Link
          to="/login"
          className="mt-6 text-sm font-semibold text-primary-600 transition hover:text-primary-700"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
