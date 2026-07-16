import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';

import Button from '../../components/ui/Button';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';
import { useResendCooldown } from '../../hooks/useResendCooldown';

function VerifyEmailContent({ email }) {
  const normalizedEmail = email.trim().toLowerCase();
  const storageKey = normalizedEmail ? `trabage_verify_cooldown_${normalizedEmail}` : null;
  const { cooldown, canResend, startCooldown } = useResendCooldown(storageKey);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!canResend || !normalizedEmail) return;

    setLoading(true);
    setError('');
    setMessage('');

    const { error: resendError } = await authService.resendVerificationEmail(normalizedEmail);
    if (resendError) {
      setError(mapAuthError(resendError));
    } else {
      setMessage('Hemos enviado un nuevo enlace de verificación a tu correo.');
      startCooldown();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh bg-[#ECEEF1]">
      <div
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-5 py-10 text-center sm:px-6"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-center">
          <TrabaGEWordmark className="h-9 w-auto sm:h-10" />
        </div>

        <div className="login-fade-in mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Mail className="h-8 w-8" aria-hidden />
        </div>

        <h1 className="login-fade-in mt-6 text-[1.65rem] font-bold tracking-tight text-slate-900">
          Verifica tu correo
        </h1>
        <p className="login-fade-in mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Hemos enviado un enlace de verificación
          {normalizedEmail ? (
            <>
              {' '}
              a{' '}
              <span className="font-semibold text-slate-700">{normalizedEmail}</span>
            </>
          ) : (
            ' a tu correo electrónico'
          )}
          . Pulsa el enlace para activar tu cuenta.
        </p>

        <div className="login-fade-in-delayed mt-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:p-7">
          <p className="text-sm leading-relaxed text-slate-600">
            Revisa tu bandeja de entrada y la carpeta de spam. Una vez verificado, podrás iniciar
            sesión en TrabaGE.
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

          {normalizedEmail ? (
            <Button
              type="button"
              fullWidth
              loading={loading}
              disabled={!canResend}
              onClick={handleResend}
              className="relative mt-5 !rounded-xl py-3.5 text-base font-semibold"
            >
              {canResend ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Reenviar correo
                </span>
              ) : (
                `Reenviar en ${cooldown}s`
              )}
            </Button>
          ) : null}

          <Link
            to="/login"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            He verificado mi correo
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          ¿Correo incorrecto?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            Volver al registro
          </Link>
        </p>

        <div className="mt-8 flex justify-center">
          <ZarrelCredit variant="developed" />
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || '';

  if (!email.trim()) {
    return <Navigate to="/register" replace />;
  }

  return <VerifyEmailContent email={email} />;
}
