import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import AuthEntryLayout, {
  AuthDivider,
  AuthField,
  AuthPrimaryButton,
} from '../../components/auth/AuthEntryLayout';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import GoogleAccountMissingDialog from '../../components/auth/GoogleAccountMissingDialog';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  ICON_SIZES,
} from '../../constants/icons';
import { clearPreviewMode } from '../../constants/preview';
import { useAuth } from '../../hooks/useAuth';
import useEmailVerificationResend from '../../hooks/useEmailVerificationResend';
import {
  authService,
  getEmailNotVerifiedMessage,
  isEmailNotVerifiedError,
} from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';
import { resolveLoginRedirectPath } from '../../utils/resolveLoginRedirect';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';

const AUTH_ALERT_SUCCESS =
  'rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-xs text-success-700';
const AUTH_ALERT_ERROR =
  'rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700';

function EmailVerificationPanel({ email, onBack }) {
  const { resend, remaining, sending, message, error, canResend } =
    useEmailVerificationResend(email);

  return (
    <div className="text-center">
      <AppIcon icon={MailCheck} size={ICON_SIZES.lg} className="mx-auto text-primary-600" aria-hidden />
      <p className="mt-3 text-xs leading-relaxed text-[#64748B]">{getEmailNotVerifiedMessage()}</p>
      {email ? (
        <p className="mt-2 break-all text-xs font-semibold text-primary-600">{email}</p>
      ) : null}
      {message ? (
        <p role="status" className={`mt-3 ${AUTH_ALERT_SUCCESS}`}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={`mt-3 ${AUTH_ALERT_ERROR}`}>
          {error}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <Button
          type="button"
          fullWidth
          loading={sending}
          disabled={!canResend}
          onClick={resend}
          className="!h-10 !rounded-xl !text-sm !font-semibold"
        >
          {remaining > 0 ? `Reenviar correo en ${remaining}s` : 'Reenviar correo'}
        </Button>
        <Button
          variant="secondary"
          type="button"
          fullWidth
          onClick={onBack}
          className="!h-10 !rounded-xl !text-sm"
        >
          Volver
        </Button>
      </div>
    </div>
  );
}

function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
  onGoogleLogin,
  googleLoading,
  googleAccountMissing,
  onDismissGoogleMissing,
  onCreateAccountFromGoogleMissing,
  emailVerificationRequired,
  onDismissEmailVerification,
  verificationSuccess,
}) {
  return (
    <AuthEntryLayout
      mode="login"
      title={emailVerificationRequired ? 'Verifica tu correo' : 'Bienvenido de nuevo'}
      subtitle={
        emailVerificationRequired
          ? 'Revisa tu bandeja de entrada para continuar'
          : 'Inicia sesión para continuar'
      }
    >
      <GoogleAccountMissingDialog
        isOpen={googleAccountMissing && !emailVerificationRequired}
        onClose={onDismissGoogleMissing}
        onCreateAccount={onCreateAccountFromGoogleMissing}
      />

      {emailVerificationRequired ? (
        <EmailVerificationPanel email={email} onBack={onDismissEmailVerification} />
      ) : (
        <>
          {verificationSuccess ? (
            <p role="status" className={`mb-3 ${AUTH_ALERT_SUCCESS}`}>
              Tu correo ha sido verificado correctamente. Ya puedes iniciar sesión.
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <AuthField
              id="login-email"
              label="Correo electrónico"
              icon={Mail}
              type="email"
              name="trabage-email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="space-y-2">
              <AuthField id="login-password" label="Contraseña" icon={Lock}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="trabage-password"
                autoComplete="current-password"
                required
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-11 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#94A3B8] hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <AppIcon icon={showPassword ? EyeOff : Eye} size={18} aria-hidden />
              </button>
            </AuthField>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-[13px] font-medium text-primary-600 hover:text-primary-700"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error ? (
              <p role="alert" className={AUTH_ALERT_ERROR}>
                {error}
              </p>
            ) : null}

            <AuthPrimaryButton type="submit" disabled={loading} className={loading ? 'opacity-80' : ''}>
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
              ) : (
                <>
                  Iniciar sesión
                  <AppIcon icon={ArrowRight} size={18} aria-hidden />
                </>
              )}
            </AuthPrimaryButton>
          </form>

          <AuthDivider />

          <GoogleAuthButton
            onClick={onGoogleLogin}
            label="Continuar con Google"
            loading={googleLoading}
          />
        </>
      )}
    </AuthEntryLayout>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    isAuthenticated,
    isPreviewMode,
    role,
    getHomePath,
    loading: authLoading,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() =>
    location.state?.roleResolveFailed
      ? 'No se pudo cargar tu cuenta. Intenta iniciar sesión de nuevo.'
      : '',
  );
  const [loading, setLoading] = useState(false);
  const [googleAccountMissing, setGoogleAccountMissing] = useState(
    () => location.state?.googleAccountMissing === true,
  );
  const [googleAccountMissingEmail, setGoogleAccountMissingEmail] = useState(
    () => String(location.state?.googleAccountMissingEmail || '').trim(),
  );
  const [googleAccountMissingFullName, setGoogleAccountMissingFullName] = useState(
    () => String(location.state?.googleAccountMissingFullName || '').trim(),
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(
    () => location.state?.emailVerificationRequired === true,
  );
  const [verificationSuccess] = useState(
    () => location.state?.emailVerificationSuccess === true,
  );

  useEffect(() => {
    if (location.state?.googleAccountMissing) {
      setGoogleAccountMissing(true);
      setGoogleAccountMissingEmail(String(location.state.googleAccountMissingEmail || '').trim());
      setGoogleAccountMissingFullName(
        String(location.state.googleAccountMissingFullName || '').trim(),
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const submitLogin = async (loginEmail, loginPassword) => {
    setLoading(true);
    setError('');
    setEmailVerificationRequired(false);
    clearPreviewMode();

    try {
      const { error: loginError, redirectTo } = await login(loginEmail, loginPassword);
      if (loginError) {
        if (isEmailNotVerifiedError(loginError)) {
          setEmail(loginEmail.trim().toLowerCase());
          setEmailVerificationRequired(true);
          return false;
        }
        setError(mapAuthError(loginError));
        return false;
      }

      navigate(resolveLoginRedirectPath(location, redirectTo || '/'), { replace: true });
      return true;
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    clearPreviewMode();
    setGoogleLoading(true);

    try {
      const { error: googleError } = await authService.loginWithGoogle();
      if (googleError) {
        setError(mapAuthError(googleError));
        setGoogleLoading(false);
      }
    } catch {
      setError(mapAuthError({ message: 'network error' }));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  const handleDismissGoogleMissing = () => {
    setGoogleAccountMissing(false);
    setGoogleAccountMissingEmail('');
    setGoogleAccountMissingFullName('');
  };

  const handleCreateAccountFromGoogleMissing = () => {
    const prefillEmail = googleAccountMissingEmail || email;
    const prefillFullName = googleAccountMissingFullName;
    setGoogleAccountMissing(false);
    navigate('/register', {
      replace: false,
      state: {
        email: prefillEmail || undefined,
        fullName: prefillFullName || undefined,
        fromGoogleLoginMissing: true,
      },
    });
  };

  const handleDismissEmailVerification = () => {
    setEmailVerificationRequired(false);
    setPassword('');
  };

  if (authLoading && !googleAccountMissing) {
    return <AuthLoadingScreen />;
  }

  // Authenticated users with a resolved role go straight home.
  if (isAuthenticated && !isPreviewMode && role && !googleAccountMissing) {
    return <Navigate to={getHomePath() || '/'} replace />;
  }

  // Session present but role still hydrating — never flash Register mid-login.
  if (isAuthenticated && !isPreviewMode && !role && !googleAccountMissing) {
    return <AuthLoadingScreen />;
  }

  return (
    <LoginScreen
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      onGoogleLogin={handleGoogleLogin}
      googleLoading={googleLoading}
      googleAccountMissing={googleAccountMissing}
      onDismissGoogleMissing={handleDismissGoogleMissing}
      onCreateAccountFromGoogleMissing={handleCreateAccountFromGoogleMissing}
      emailVerificationRequired={emailVerificationRequired}
      onDismissEmailVerification={handleDismissEmailVerification}
      verificationSuccess={verificationSuccess}
    />
  );
}
