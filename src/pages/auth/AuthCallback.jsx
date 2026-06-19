import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import Spinner from '../../components/ui/Spinner';
import { clearPreviewMode } from '../../constants/preview';
import { authService } from '../../services/auth.service';
import { resolvePostAuthRedirect } from '../../utils/resolvePostAuthRedirect';

const MAX_ATTEMPTS = 15;
const RETRY_MS = 300;

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resolved = false;

    const finish = async () => {
      clearPreviewMode();

      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError = queryParams.get('error_description') || hashParams.get('error_description');
      if (oauthError) {
        setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
        return;
      }

      const redirectFromSession = async (session) => {
        if (!session?.user?.id || cancelled || resolved) return false;
        // Claim the resolution up front so the onAuthStateChange handler and
        // the polling loop can't both run resolvePostAuthRedirect / navigate.
        resolved = true;
        const redirectTo = await resolvePostAuthRedirect(session.user.id);
        if (cancelled) return true;
        navigate(redirectTo, { replace: true });
        return true;
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          await redirectFromSession(session);
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
          setError(sessionError.message || 'No se pudo completar el inicio de sesión con Google');
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
  }, [navigate]);

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
