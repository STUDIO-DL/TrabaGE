import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MailCheck, Pencil } from 'lucide-react';
import Button from '../../components/ui/Button';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import useEmailVerificationResend from '../../hooks/useEmailVerificationResend';

const PENDING_EMAIL_KEY = 'trabage_pending_verification_email';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email] = useState(() => {
    const value =
      location.state?.email || sessionStorage.getItem(PENDING_EMAIL_KEY) || '';
    return String(value).trim().toLowerCase();
  });
  const sentAt = location.state?.sentAt || null;
  const { resend, remaining, sending, message, error, canResend } =
    useEmailVerificationResend(email, sentAt);

  useEffect(() => {
    if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  }, [email]);

  const changeEmail = () => {
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
    navigate('/register', { state: { email } });
  };

  return (
    <main className="min-h-dvh bg-app-bg px-5 py-10 text-app-text">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="flex justify-center">
          <TrabaGEWordmark className="h-10 w-auto" />
        </div>

        <section className="mt-8 rounded-3xl border border-app-border bg-app-card p-6 text-center shadow-elevation-3 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <MailCheck className="h-8 w-8" aria-hidden />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Verifica tu correo electrónico
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-app-muted">
            Hemos enviado un enlace de verificación a tu dirección de correo.
          </p>
          {email ? (
            <p className="mt-2 break-all text-sm font-semibold text-primary-600">
              {email}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-app-muted">
            Revisa tu bandeja de entrada (y la carpeta de spam si es necesario)
            para activar tu cuenta.
          </p>

          {message ? (
            <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {!email ? (
            <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No encontramos el correo pendiente. Vuelve al registro para continuar.
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              fullWidth
              loading={sending}
              disabled={!canResend}
              onClick={resend}
              className="!rounded-xl"
            >
              {remaining > 0 ? `Reenviar correo en ${remaining}s` : 'Reenviar correo'}
            </Button>

            <button
              type="button"
              onClick={changeEmail}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm font-semibold text-app-text transition hover:bg-app-surface"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Cambiar correo
            </button>

            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al inicio de sesión
            </Link>
          </div>
        </section>

        <div className="mt-8 flex justify-center">
          <ZarrelCredit variant="developed" />
        </div>
      </div>
    </main>
  );
}
