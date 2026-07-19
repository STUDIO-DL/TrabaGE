import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import { LegalFooterLinks } from '../../components/legal/LegalLinks';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  User,
  ICON_SIZES,
} from '../../constants/icons';
import { clearPreviewMode } from '../../constants/preview';
import { useAuth } from '../../hooks/useAuth';
import { getOnboardingComplete } from '../../context/AuthContext';
import useEmailVerificationResend from '../../hooks/useEmailVerificationResend';
import {
  authService,
  getEmailNotVerifiedMessage,
  getGoogleLoginNoAccountMessage,
  isEmailNotVerifiedError,
} from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';
import { resolveLoginRedirectPath } from '../../utils/resolveLoginRedirect';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';

const AUTH_ALERT_SUCCESS =
  'rounded-radius-md border border-success-200 bg-success-50 px-space-md py-space-sm text-body-small text-success-700';
const AUTH_ALERT_ERROR =
  'rounded-radius-md border border-error-200 bg-error-50 px-space-md py-space-sm text-body-small text-error-700';

function LoginDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft blue wavy shapes — top */}
      <svg
        className="absolute -left-24 -top-28 h-80 w-80 text-primary-100/70"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M44.6 -64.8C57.1 -55.7 66 -41.6 70.9 -26.3C75.8 -11 76.7 5.4 71.3 19.3C65.9 33.2 54.2 44.6 40.8 53.7C27.4 62.8 12.3 69.6 -3.6 74.6C-19.5 79.6 -36.2 82.8 -49.3 76.3C-62.4 69.8 -71.9 53.6 -76.6 37C-81.3 20.4 -81.2 3.4 -77 -12.1C-72.8 -27.6 -64.5 -41.6 -52.6 -50.9C-40.7 -60.2 -25.2 -64.8 -9.4 -68.3C6.4 -71.8 32.1 -73.9 44.6 -64.8Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg
        className="absolute -right-20 -top-16 h-64 w-64 text-primary-50"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M38.5 -57.1C50.6 -49.1 61.3 -38.5 66.8 -25.4C72.3 -12.3 72.6 3.3 68.1 17.4C63.6 31.5 54.3 44.1 42.1 52.9C29.9 61.7 14.9 66.7 -0.7 67.7C-16.3 68.7 -32.7 65.7 -45.6 56.7C-58.5 47.7 -68 32.7 -71.4 16.5C-74.8 0.3 -72.1 -17.1 -64.2 -31.4C-56.3 -45.7 -43.2 -56.9 -29 -64C-14.8 -71.1 0.5 -74.1 13.8 -70.4C27.1 -66.7 26.4 -65.1 38.5 -57.1Z"
          transform="translate(100 100)"
        />
      </svg>
      {/* Faint dotted pattern — top right */}
      <svg className="absolute right-6 top-24 h-24 w-24 text-primary-200/60" viewBox="0 0 80 80">
        <defs>
          <pattern id="login-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="80" height="80" fill="url(#login-dots)" />
      </svg>

      {/* Bottom waves + city skyline */}
      <svg
        className="absolute bottom-0 left-0 w-full text-primary-100/60"
        viewBox="0 0 500 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M0 140C60 110 120 110 180 130C250 153 320 150 390 130C430 119 470 119 500 128V200H0V140Z"
          opacity="0.5"
        />
        {/* City skyline silhouette */}
        <g fill="currentColor" opacity="0.55">
          <rect x="20" y="150" width="26" height="50" />
          <rect x="52" y="135" width="20" height="65" />
          <rect x="78" y="158" width="22" height="42" />
          <rect x="106" y="142" width="18" height="58" />
          <rect x="130" y="125" width="24" height="75" />
          <rect x="160" y="150" width="20" height="50" />
          <rect x="186" y="138" width="22" height="62" />
          <rect x="214" y="118" width="16" height="82" />
          <rect x="236" y="150" width="24" height="50" />
          <rect x="266" y="132" width="20" height="68" />
          <rect x="292" y="148" width="26" height="52" />
          <rect x="324" y="138" width="18" height="62" />
          <rect x="348" y="155" width="22" height="45" />
          <rect x="376" y="128" width="22" height="72" />
          <rect x="404" y="148" width="20" height="52" />
          <rect x="430" y="140" width="24" height="60" />
          <rect x="462" y="152" width="22" height="48" />
        </g>
        {/* Palm tree hint */}
        <g fill="currentColor" opacity="0.6">
          <rect x="446" y="120" width="4" height="40" rx="2" />
          <path d="M448 120C440 112 432 112 426 118C434 116 442 118 448 124C454 118 462 116 470 118C464 112 456 112 448 120Z" />
        </g>
      </svg>
    </div>
  );
}

function GoogleAccountMissingPanel({ message, onDismiss }) {
  return (
    <div
      role="status"
      className="login-fade-in-delayed rounded-radius-xl border border-app-border bg-app-surface px-space-base py-space-base text-left"
    >
      <p className="whitespace-pre-line text-body-small leading-relaxed text-app-muted">{message}</p>
      <div className="mt-space-base flex flex-col gap-space-sm sm:flex-row">
        <Link to="/register" className="flex-1">
          <Button fullWidth size="md" className="!rounded-radius-md">
            Crear cuenta
          </Button>
        </Link>
        <Button variant="secondary" fullWidth size="md" className="!rounded-radius-md" onClick={onDismiss}>
          Volver al inicio de sesión
        </Button>
      </div>
    </div>
  );
}

function EmailVerificationPanel({ email, onBack }) {
  const { resend, remaining, sending, message, error, canResend } =
    useEmailVerificationResend(email);

  return (
    <div className="login-fade-in-delayed text-center">
      <AppIcon icon={MailCheck} size={ICON_SIZES.lg} className="mx-auto text-primary-600" aria-hidden />
      <h2 className="mt-space-base text-title text-app-text">Verifica tu correo electrónico</h2>
      <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
        {getEmailNotVerifiedMessage()}
      </p>
      {email ? <p className="mt-space-sm break-all text-body-small font-semibold text-primary-600">{email}</p> : null}
      {message ? (
        <p role="status" className={`mt-space-base ${AUTH_ALERT_SUCCESS}`}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={`mt-space-base ${AUTH_ALERT_ERROR}`}>
          {error}
        </p>
      ) : null}
      <div className="mt-space-lg space-y-space-md">
        <Button
          type="button"
          fullWidth
          loading={sending}
          disabled={!canResend}
          onClick={resend}
          size="lg"
          className="!rounded-radius-md"
        >
          {remaining > 0 ? `Reenviar correo en ${remaining}s` : 'Reenviar correo'}
        </Button>
        <Button variant="secondary" type="button" fullWidth size="lg" className="!rounded-radius-md" onClick={onBack}>
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
  onExplore,
  onGoogleLogin,
  googleAccountMissing,
  googleAccountMissingMessage,
  onDismissGoogleMissing,
  emailVerificationRequired,
  onDismissEmailVerification,
  verificationSuccess,
}) {
  return (
    <div className="keyboard-scroll-host relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-gradient-to-b from-primary-50 via-app-card to-primary-50">
      <LoginDecorations />

      <div
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-space-lg py-space-3xl sm:px-space-xl"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="login-fade-in flex flex-1 flex-col justify-center">
          <div className="text-center">
            <TrabaGEWordmark className="mx-auto block h-10 w-auto" />
          </div>

          <div className="mt-space-xl text-center">
            <h1 className="text-title text-app-text">Bienvenido</h1>
            <p className="mx-auto mt-space-sm max-w-xs text-body-small leading-relaxed text-app-muted">
              Conecta con oportunidades, empresas y clientes desde un solo lugar.
            </p>
          </div>

          <div className="login-card login-fade-in-delayed mt-space-xl p-space-lg sm:p-space-xl">
            {emailVerificationRequired ? (
              <EmailVerificationPanel email={email} onBack={onDismissEmailVerification} />
            ) : googleAccountMissing ? (
              <GoogleAccountMissingPanel
                message={googleAccountMissingMessage || getGoogleLoginNoAccountMessage()}
                onDismiss={onDismissGoogleMissing}
              />
            ) : (
              <>
                {verificationSuccess ? (
                  <p role="status" className={`mb-space-base ${AUTH_ALERT_SUCCESS}`}>
                    Tu correo ha sido verificado correctamente. Ya puedes iniciar sesión.
                  </p>
                ) : null}
                <form onSubmit={onSubmit} className="space-y-space-base" autoComplete="off">
                  <Input
                    id="login-email"
                    label={
                      <span className="inline-flex items-center gap-space-sm">
                        <AppIcon icon={Mail} size={ICON_SIZES.sm} className="text-primary-600" aria-hidden />
                        Correo electrónico
                      </span>
                    }
                    type="email"
                    name="trabage-email"
                    autoComplete="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <div>
                    <label
                      htmlFor="login-password"
                      className="mb-space-sm flex items-center gap-space-sm text-label font-semibold text-app-text"
                    >
                      <AppIcon icon={Lock} size={ICON_SIZES.sm} className="text-primary-600" aria-hidden />
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        name="trabage-password"
                        autoComplete="current-password"
                        required
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-input-md w-full min-w-0 rounded-radius-md border border-app-border bg-app-card px-space-base py-space-sm pr-12 text-body-small text-app-text outline-none transition-colors duration-fast ease-out placeholder:text-app-subtle focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-space-md top-1/2 -translate-y-1/2 rounded-radius-sm p-space-xs text-app-subtle transition-colors duration-fast ease-out hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <AppIcon icon={showPassword ? EyeOff : Eye} size={ICON_SIZES.md} aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-body-small font-medium text-primary-600 transition-colors duration-fast ease-out hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  {error && (
                    <p role="alert" className={AUTH_ALERT_ERROR}>
                      {error}
                    </p>
                  )}

                  <Button type="submit" fullWidth loading={loading} size="lg" className="!rounded-radius-md">
                    Iniciar sesión
                  </Button>
                </form>

                <div className="relative my-space-lg">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-app-border" />
                  </div>
                  <div className="relative flex justify-center text-caption font-medium text-app-subtle">
                    <span className="bg-app-card px-space-md">o</span>
                  </div>
                </div>

                <div className="space-y-space-md">
                  <GoogleAuthButton
                    onClick={onGoogleLogin}
                    label="Iniciar sesión con Google"
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    size="lg"
                    onClick={onExplore}
                    className="!rounded-radius-md !bg-primary-50 !text-primary-700 hover:!bg-primary-100"
                  >
                    <AppIcon icon={User} size={ICON_SIZES.md} aria-hidden />
                    Explorar como invitado
                  </Button>
                </div>
              </>
            )}
          </div>

          {!googleAccountMissing && !emailVerificationRequired ? (
            <p className="mt-space-xl text-center text-body-small text-app-subtle">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-bold text-primary-600 transition-colors duration-fast ease-out hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Crear cuenta
              </Link>
            </p>
          ) : null}
        </div>

        <div className="mt-space-2xl space-y-space-base">
          <LegalFooterLinks />
          <div className="flex items-start justify-center gap-space-sm text-center">
            <AppIcon icon={ShieldCheck} size={ICON_SIZES.sm} className="mt-0.5 shrink-0 text-primary-600" aria-hidden />
            <p className="text-caption leading-relaxed text-app-subtle">
              Seguro, confiable y hecho para ti.
              <br />
              TrabaGE es tu plataforma de oportunidades.
            </p>
          </div>
          <div className="flex justify-center pt-space-xs">
            <ZarrelCredit variant="developed" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    enterPreviewMode,
    isAuthenticated,
    isPreviewMode,
    role,
    getHomePath,
    loading: authLoading,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAccountMissing, setGoogleAccountMissing] = useState(
    () => location.state?.googleAccountMissing === true,
  );
  const [googleAccountMissingMessage, setGoogleAccountMissingMessage] = useState(
    () => location.state?.googleAccountMissingMessage || getGoogleLoginNoAccountMessage(),
  );
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(
    () => location.state?.emailVerificationRequired === true,
  );
  const [verificationSuccess] = useState(
    () => location.state?.emailVerificationSuccess === true,
  );

  useEffect(() => {
    if (location.state?.googleAccountMissing) {
      setGoogleAccountMissing(true);
      setGoogleAccountMissingMessage(
        location.state.googleAccountMissingMessage || getGoogleLoginNoAccountMessage(),
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleExplore = () => {
    enterPreviewMode();
    navigate('/explore', { replace: true });
  };

  const submitLogin = async (loginEmail, loginPassword) => {
    setLoading(true);
    setError('');
    setEmailVerificationRequired(false);
    clearPreviewMode();

    const { error: loginError, redirectTo } = await login(loginEmail, loginPassword);
    if (loginError) {
      if (isEmailNotVerifiedError(loginError)) {
        setEmail(loginEmail.trim().toLowerCase());
        setEmailVerificationRequired(true);
        setLoading(false);
        return false;
      }
      setError(mapAuthError(loginError));
      setLoading(false);
      return false;
    }

    navigate(resolveLoginRedirectPath(location, redirectTo || '/'), { replace: true });
    setLoading(false);
    return true;
  };

  const handleGoogleLogin = async () => {
    setError('');
    clearPreviewMode();

    const { error: googleError } = await authService.loginWithGoogle();
    if (googleError) {
      setError(mapAuthError(googleError));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  const handleDismissGoogleMissing = () => {
    setGoogleAccountMissing(false);
  };

  const handleDismissEmailVerification = () => {
    setEmailVerificationRequired(false);
    setPassword('');
  };

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  // First-time visitors see onboarding before login; deep links from protected routes skip it.
  if (
    !isAuthenticated &&
    !isPreviewMode &&
    !getOnboardingComplete() &&
    !location.state?.from
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Authenticated users with a resolved role go straight home.
  if (isAuthenticated && !isPreviewMode && role) {
    return <Navigate to={getHomePath() || '/'} replace />;
  }

  // Session present but role still hydrating — never flash Register mid-login.
  if (isAuthenticated && !isPreviewMode && !role) {
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
      onExplore={handleExplore}
      onGoogleLogin={handleGoogleLogin}
      googleAccountMissing={googleAccountMissing}
      googleAccountMissingMessage={googleAccountMissingMessage}
      onDismissGoogleMissing={handleDismissGoogleMissing}
      emailVerificationRequired={emailVerificationRequired}
      onDismissEmailVerification={handleDismissEmailVerification}
      verificationSuccess={verificationSuccess}
    />
  );
}
