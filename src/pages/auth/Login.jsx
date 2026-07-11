import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';

import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import { LegalFooterLinks } from '../../components/legal/LegalLinks';
import { clearPreviewMode } from '../../constants/preview';
import { useAuth } from '../../hooks/useAuth';
import { authService, GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';

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
      className="login-fade-in-delayed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{message}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/register"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Crear cuenta
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Volver al inicio de sesión
        </button>
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
}) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-white to-[#EFF6FF]">
      <LoginDecorations />

      <div
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10 sm:px-6"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="login-fade-in flex flex-1 flex-col justify-center">
          {/* Wordmark */}
          <div className="flex justify-center">
            <TrabaGEWordmark className="h-10 w-auto" />
          </div>

          {/* Heading + subtitle */}
          <div className="mt-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Bienvenido</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#64748B]">
              Conecta con oportunidades, empresas y clientes desde un solo lugar.
            </p>
          </div>

          {/* Card */}
          <div className="login-fade-in-delayed mt-7 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.10)] sm:p-7">
            {googleAccountMissing ? (
              <GoogleAccountMissingPanel
                message={googleAccountMissingMessage || GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE}
                onDismiss={onDismissGoogleMissing}
              />
            ) : (
              <>
                <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                    >
                      <Mail className="h-4 w-4 text-primary-600" aria-hidden />
                      Correo electrónico
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      name="trabage-email"
                      autoComplete="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                    >
                      <Lock className="h-4 w-4 text-primary-600" aria-hidden />
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
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                        ) : (
                          <Eye className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-primary-600 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    className="relative !rounded-xl py-3.5 text-base font-semibold"
                  >
                    Iniciar sesión
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs font-medium text-slate-500">
                    <span className="bg-white px-3">o</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <GoogleAuthButton
                    onClick={onGoogleLogin}
                    label="Iniciar sesión con Google"
                  />

                  <button
                    type="button"
                    onClick={onExplore}
                    className="flex h-btn-secondary w-full items-center justify-center gap-3 rounded-xl bg-primary-50 px-md text-small font-semibold text-primary-700 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    <User className="h-5 w-5" aria-hidden />
                    <span>Explorar como invitado</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Crear cuenta */}
          {!googleAccountMissing ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-bold text-primary-600 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Crear cuenta
              </Link>
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-4">
          <LegalFooterLinks />
          <div className="flex items-start justify-center gap-2 text-center">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
            <p className="text-xs leading-relaxed text-slate-500">
              Seguro, confiable y hecho para ti.
              <br />
              TrabaGE es tu plataforma de oportunidades.
            </p>
          </div>
          <div className="flex justify-center pt-1">
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
    () => location.state?.googleAccountMissingMessage || GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE,
  );

  useEffect(() => {
    if (location.state?.googleAccountMissing) {
      setGoogleAccountMissing(true);
      setGoogleAccountMissingMessage(
        location.state.googleAccountMissingMessage || GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE,
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
    clearPreviewMode();

    const { error: loginError, redirectTo } = await login(loginEmail, loginPassword);
    if (loginError) {
      setError(mapAuthError(loginError));
      setLoading(false);
      return false;
    }

    navigate(redirectTo || '/', { replace: true });
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

  // While session/role hydrate, keep a quiet loader — never flash /register.
  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Authenticated users with a resolved role go straight home.
  if (isAuthenticated && !isPreviewMode && role) {
    return <Navigate to={getHomePath() || '/'} replace />;
  }

  // Session present but role still resolving — avoid the register flicker.
  if (isAuthenticated && !isPreviewMode && !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
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
    />
  );
}
