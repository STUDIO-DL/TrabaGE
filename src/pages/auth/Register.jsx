import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';

import Button from '../../components/ui/Button';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import AccountTypeCards from '../../components/auth/AccountTypeCards';
import AutocompleteInput from '../../components/ui/AutocompleteInput';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import { LegalFooterLinks, LegalInlineLink } from '../../components/legal/LegalLinks';
import { CITIES } from '../../constants/cities';
import { accountKindToRole, isValidAccountKind } from '../../constants/accountKinds';
import { clearPreviewMode } from '../../constants/preview';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';
import { validateStrongPassword } from '../../utils/passwordValidation';

function RegisterDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
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
      <svg className="absolute right-6 top-24 h-24 w-24 text-primary-200/60" viewBox="0 0 80 80">
        <defs>
          <pattern id="register-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="80" height="80" fill="url(#register-dots)" />
      </svg>
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
      </svg>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, user, isAuthenticated, refreshAuthState, getHomePath } = useAuth();
  const fromOAuth = location.state?.fromOAuth === true;
  const oauthCompletion = fromOAuth && isAuthenticated && Boolean(user?.id);

  const [accountKind, setAccountKind] = useState(location.state?.accountKind ?? '');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (location.state?.accountKind && isValidAccountKind(location.state.accountKind)) {
      setAccountKind(location.state.accountKind);
    }
  }, [location.state?.accountKind]);

  const citySuggestions = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    if (!query) return CITIES.slice(0, 8);
    return CITIES.filter((item) => item.toLowerCase().includes(query)).slice(0, 8);
  }, [cityQuery]);

  const handleGoogleRegister = async () => {
    setError('');

    if (!accountKind) {
      setError('Selecciona un tipo de cuenta.');
      return;
    }

    clearPreviewMode();

    const { error: googleError } = await authService.signupWithGoogle(accountKind);
    if (googleError) {
      setError(mapAuthError(googleError));
    }
  };

  const handleOAuthRoleComplete = async (e) => {
    e.preventDefault();

    if (!accountKind) {
      setError('Selecciona un tipo de cuenta.');
      return;
    }

    setLoading(true);
    setError('');

    const role = accountKindToRole(accountKind);
    const { error: roleError } = await authService.setUserRole(user.id, role);

    if (roleError) {
      setError(mapAuthError(roleError));
      setLoading(false);
      return;
    }

    await refreshAuthState();
    navigate(getHomePath(), { replace: true });
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accountKind) {
      setError('Selecciona un tipo de cuenta.');
      return;
    }

    if (!fullName.trim()) {
      setError('Introduce tu nombre completo.');
      return;
    }

    if (!email.trim()) {
      setError('Introduce tu correo electrónico.');
      return;
    }

    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!city.trim()) {
      setError('Selecciona tu ciudad.');
      return;
    }

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y la política de privacidad.');
      return;
    }

    setLoading(true);
    setError('');

    const role = accountKindToRole(accountKind);
    const { error: registerError, redirectTo } = await register(email, password, role, {
      fullName: fullName.trim(),
      city: city.trim(),
      accountKind,
    });

    if (registerError) {
      setError(mapAuthError(registerError));
      setLoading(false);
      return;
    }

    if (redirectTo) {
      setLoading(false);
      navigate(redirectTo, { replace: true });
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-white to-[#EFF6FF]">
        <RegisterDecorations />
        <div
          className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center sm:px-6"
          style={{
            paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}
        >
          <TrabaGEWordmark className="h-10 w-auto" />
          <h1 className="login-fade-in mt-8 text-2xl font-bold tracking-tight text-slate-900">
            Hemos enviado un enlace de verificación a tu correo.
          </h1>
          <p className="login-fade-in-delayed mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Verifica tu correo para activar tu cuenta y acceder a TrabaGE.
          </p>
          <Link
            to="/login"
            className="login-fade-in-delayed mt-8 inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-primary-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-primary-700"
          >
            He verificado mi correo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-white to-[#EFF6FF]">
      <RegisterDecorations />

      <div
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10 sm:px-6"
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="login-fade-in flex flex-1 flex-col justify-center">
          <div className="flex justify-center">
            <TrabaGEWordmark className="h-10 w-auto" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Crear cuenta</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#64748B]">
              {oauthCompletion
                ? 'Elige el tipo de cuenta para completar tu registro.'
                : 'Únete a la plataforma de oportunidades para Guinea Ecuatorial.'}
            </p>
          </div>

          {fromOAuth && !oauthCompletion ? (
            <div className="login-fade-in-delayed mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Inicia sesión o completa el registro para continuar.
            </div>
          ) : null}

          {oauthCompletion ? (
            <div className="login-fade-in-delayed mt-7 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.10)] sm:p-7">
              <form onSubmit={handleOAuthRoleComplete} className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-900">Tipo de cuenta</p>
                  <AccountTypeCards value={accountKind} onChange={setAccountKind} disabled={loading} />
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  className="relative !rounded-xl py-3.5 text-base font-semibold"
                >
                  Continuar
                </Button>
              </form>
            </div>
          ) : (
            <div className="login-fade-in-delayed mt-7 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.10)] sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-900">Tipo de cuenta</p>
                  <AccountTypeCards value={accountKind} onChange={setAccountKind} disabled={loading} />
                </div>

                <div>
                  <label
                    htmlFor="register-full-name"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <User className="h-4 w-4 text-primary-600" aria-hidden />
                    Nombre completo
                  </label>
                  <input
                    id="register-full-name"
                    type="text"
                    name="trabage-full-name"
                    autoComplete="name"
                    required
                    placeholder="Tu nombre y apellidos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-email"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <Mail className="h-4 w-4 text-primary-600" aria-hidden />
                    Correo electrónico
                  </label>
                  <input
                    id="register-email"
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
                    htmlFor="register-password"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <Lock className="h-4 w-4 text-primary-600" aria-hidden />
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      name="trabage-password"
                      autoComplete="new-password"
                      required
                      placeholder="Mín. 10 caracteres"
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
                  <p className="mt-1.5 text-xs text-slate-500">
                    Mayúscula, minúscula, número y símbolo.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <Lock className="h-4 w-4 text-primary-600" aria-hidden />
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="trabage-confirm-password"
                      autoComplete="new-password"
                      required
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                      ) : (
                        <Eye className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="register-city"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <MapPin className="h-4 w-4 text-primary-600" aria-hidden />
                    Ciudad
                  </label>
                  <AutocompleteInput
                    value={cityQuery}
                    onChange={setCityQuery}
                    onSelect={(selected) => {
                      setCity(selected);
                      setCityQuery(selected);
                    }}
                    suggestions={citySuggestions}
                    placeholder="Busca tu ciudad"
                    inputClassName="!py-3 !text-base md:!text-sm"
                  />
                  {city ? (
                    <p className="mt-1.5 text-xs text-primary-700">
                      Ciudad seleccionada: <span className="font-medium">{city}</span>
                    </p>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs leading-relaxed text-slate-600">
                    Acepto los{' '}
                    <LegalInlineLink to={LEGAL_ROUTES.terms}>Términos de Uso</LegalInlineLink> y la{' '}
                    <LegalInlineLink to={LEGAL_ROUTES.privacy}>Política de Privacidad</LegalInlineLink>.
                  </span>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  className="relative !rounded-xl py-3.5 text-base font-semibold"
                >
                  Crear cuenta
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-medium text-slate-500">
                  <span className="bg-white px-3">o</span>
                </div>
              </div>

              <GoogleAuthButton onClick={handleGoogleRegister} />
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-bold text-primary-600 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>

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
        </div>
      </div>
    </div>
  );
}
