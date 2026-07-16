import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';

export default function AuthConfirm() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return undefined;
    started.current = true;
    let cancelled = false;
    let redirectTimer;

    const confirm = async () => {
      const { error: confirmationError } = await authService.confirmEmailFromUrl();
      if (cancelled) return;

      if (confirmationError) {
        setError(mapAuthError(confirmationError));
        setStatus('error');
        return;
      }

      setStatus('success');
      redirectTimer = window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { emailVerificationSuccess: true },
        });
      }, 1800);
    };

    void confirm();

    return () => {
      cancelled = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <main className="min-h-dvh bg-app-bg px-5 py-10 text-app-text">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col items-center justify-center text-center">
        <TrabaGEWordmark className="h-10 w-auto" />

        <section className="mt-8 w-full rounded-3xl border border-app-border bg-app-card p-7 shadow-elevation-3">
          {status === 'loading' ? (
            <>
              <Spinner size="lg" />
              <h1 className="mt-5 text-xl font-bold">Verificando tu correo</h1>
              <p className="mt-2 text-sm text-app-muted">
                Estamos validando el enlace de confirmación. No cierres esta ventana.
              </p>
            </>
          ) : null}

          {status === 'success' ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" aria-hidden />
              <h1 className="mt-5 text-xl font-bold">Correo verificado</h1>
              <p className="mt-2 text-sm text-app-muted">
                Tu cuenta ha sido activada correctamente. Te llevamos al inicio de sesión.
              </p>
            </>
          ) : null}

          {status === 'error' ? (
            <>
              <CircleAlert className="mx-auto h-14 w-14 text-red-600" aria-hidden />
              <h1 className="mt-5 text-xl font-bold">No pudimos verificar el correo</h1>
              <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error || 'El enlace es inválido o ha expirado.'}
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Volver al inicio de sesión
              </Link>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
