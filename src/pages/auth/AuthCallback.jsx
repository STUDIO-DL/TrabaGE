import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import Spinner from '../../components/ui/Spinner';
import { clearPreviewMode } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { authService } from '../../services/auth.service';
import { bootstrapProfile } from '../../services/profileBootstrap';
import { resolvePostAuthRedirect } from '../../utils/resolvePostAuthRedirect';
import { mapAuthError } from '../../utils/errors';
import { useAuth } from '../../hooks/useAuth';

const MAX_ATTEMPTS = 15;
const RETRY_MS = 300;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshAuthState } = useAuth();
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
        // the polling loop can't both run resolvePostAuthRedirect / navigate.
        resolved = true;

        if (isPasswordRecovery || event === 'PASSWORD_RECOVERY') {
          await refreshAuthState();
          if (cancelled) return true;
          navigate('/auth/set-password', { replace: true, state: { passwordRecovery: true } });
          return true;
        }

        const { data: accountTypeResult, error: accountTypeError } =
          await authService.applyPendingAccountType(session.user);

        if (accountTypeError) {
          setError(mapAuthError(accountTypeError));
          return true;
        }

        // Safety net only: a brand-new user who reached OAuth WITHOUT a pending
        // account-type selection (e.g. "login with Google" of a new user) picks
        // their account type on /register. Signups from the register form always
        // carry the pending type, so they skip this screen entirely.
        if (accountTypeResult?.needsAccountTypeSelection) {
          if (cancelled) return true;
          navigate('/register', { replace: true, state: { fromOAuth: true } });
          return true;
        }

        const role = accountTypeResult?.role ?? null;

        // Shared profile-creation path for BOTH manual (verified) and Google
        // sign-ups: ensure the correct profile exists and prefill known data
        // (Google name/photo, city, org details). Role is already applied above,
        // which the profile INSERT policies require.
        if (role && role !== ROLES.ADMIN) {
          await bootstrapProfile({ user: session.user, role });
        }

        const redirectTo = await resolvePostAuthRedirect(session.user.id, role);

        await refreshAuthState();

        if (cancelled) return true;
        navigate(redirectTo, { replace: true });
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
  }, [navigate, refreshAuthState]);

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
