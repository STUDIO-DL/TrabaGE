import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { AUTH_CONFIRM_PATH } from '../../constants/authUrls';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import GoogleAccountMissingDialog from '../../components/auth/GoogleAccountMissingDialog';
import { clearPreviewMode } from '../../constants/preview';
import {
  authService,
  consumeOAuthIntent,
  discardUnregisteredOAuthSession,
  isLikelyUnregisteredGoogleLogin,
  OAUTH_INTENTS,
} from '../../services/auth.service';
import { completePostAuthFlow } from '../../services/authFlow';
import { queueWelcomeEmailOnRegistrationComplete } from '../../services/welcomeEmail.service';
import { mapAuthError, isExpiredVerificationUserMessage, isOAuthCancelledError } from '../../utils/errors';
import { getErrorMessage } from '../../utils/i18n';
import { extractGoogleProfile } from '../../utils/googleProfile';
import { useAuth } from '../../hooks/useAuth';

const MAX_ATTEMPTS = 8;
const RETRY_MS = 120;

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

async function rejectUnregisteredGoogleLogin(session, clearAuthAfterOAuthRejection) {
  const googleProfile = extractGoogleProfile(session.user);
  const googleEmail = googleProfile.email || String(session.user?.email || '').trim() || null;

  void (async () => {
    await discardUnregisteredOAuthSession(session.user);
    await clearAuthAfterOAuthRejection();
  })();

  return {
    email: googleEmail,
    fullName: googleProfile.full_name,
  };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshAuthState, acceptSession, clearAuthAfterOAuthRejection } = useAuth();
  const [error, setError] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [googleMissing, setGoogleMissing] = useState(null);

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
      const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
      const authCode = queryParams.get('code');

      if (emailVerification && (tokenHash || authCode) && !oauthError) {
        navigate(`${AUTH_CONFIRM_PATH}${window.location.search}${window.location.hash}`, {
          replace: true,
        });
        return;
      }

      if (oauthError) {
        const decoded = decodeURIComponent(oauthError.replace(/\+/g, ' '));
        if (isOAuthCancelledError(decoded)) {
          navigate('/login', { replace: true });
          return;
        }
        if (isExpiredLinkError(decoded)) {
          setError(getErrorMessage('expiredVerificationLink'));
        } else {
          setError(mapAuthError({ message: decoded }));
        }
        return;
      }

      if (authCode) {
        // detectSessionInUrl may already have exchanged this PKCE code.
        // A second exchange fails with a generic error — only abort if no session.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError && !isOAuthCancelledError(exchangeError)) {
          const { data: existing } = await authService.getSession();
          if (!existing?.session) {
            setError(mapAuthError(exchangeError));
            return;
          }
        }
      }

      const redirectFromSession = async (session, event = null) => {
        if (!session?.user?.id || cancelled || resolved) return false;
        resolved = true;

        try {
          if (isPasswordRecovery || event === 'PASSWORD_RECOVERY') {
            await refreshAuthState();
            if (cancelled) return true;
            navigate('/auth/set-password', { replace: true, state: { passwordRecovery: true } });
            return true;
          }

          const oauthIntent = consumeOAuthIntent();
          const isGoogleLogin = oauthIntent === OAUTH_INTENTS.LOGIN;
          const isGoogleSignup = oauthIntent === OAUTH_INTENTS.SIGNUP;

          // Reject brand-new Google LOGIN orphans immediately (no DB round-trip).
          if (isGoogleLogin && isLikelyUnregisteredGoogleLogin(session.user)) {
            const missing = await rejectUnregisteredGoogleLogin(
              session,
              clearAuthAfterOAuthRejection,
            );
            if (cancelled) return true;
            setGoogleMissing(missing);
            return true;
          }

          const {
            error: flowError,
            needsAccountTypeSelection,
            role: flowRole,
            redirectTo,
          } = await completePostAuthFlow(session.user, {
            preferProfile: isGoogleSignup,
            // Returning Google LOGIN: skip bootstrap; hydrate finishes in background.
            fastLogin: isGoogleLogin,
          });

          if (flowError) {
            setError(mapAuthError(flowError));
            if (emailVerification && session.user.email) {
              setErrorEmail(session.user.email);
            }
            return true;
          }

          if (needsAccountTypeSelection) {
            if (cancelled) return true;
            if (isGoogleLogin) {
              const missing = await rejectUnregisteredGoogleLogin(
                session,
                clearAuthAfterOAuthRejection,
              );
              if (cancelled) return true;
              setGoogleMissing(missing);
              return true;
            }
            navigate('/register', { replace: true, state: { fromOAuth: true } });
            return true;
          }

          // Welcome email ONLY after Google SIGNUP — never block navigation.
          if (isGoogleSignup) {
            void queueWelcomeEmailOnRegistrationComplete();
          }

          // Seed auth + navigate immediately; full hydrate runs in background.
          acceptSession(session, { role: flowRole, redirectTo });

          if (cancelled) return true;
          navigate(redirectTo || '/', { replace: true });
          return true;
        } catch (err) {
          if (cancelled) return true;
          setError(mapAuthError(err));
          return true;
        }
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
  }, [navigate, refreshAuthState, acceptSession, clearAuthAfterOAuthRejection]);

  if (googleMissing) {
    return (
      <div className="relative min-h-dvh w-full bg-gradient-to-b from-primary-50 via-app-card to-primary-50">
        <GoogleAccountMissingDialog
          isOpen
          onClose={() => navigate('/login', { replace: true })}
          onCreateAccount={() =>
            navigate('/register', {
              replace: true,
              state: {
                email: googleMissing.email || undefined,
                fullName: googleMissing.fullName || undefined,
                // Do not force account type — user must choose Profesional/Empresa/Organización.
                fromGoogleLoginMissing: true,
              },
            })
          }
        />
      </div>
    );
  }

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
