import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, Lock, Mail, MapPin } from 'lucide-react';

import Button from '../../components/ui/Button';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import AccountTypeCards from '../../components/auth/AccountTypeCards';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import { LegalInlineLink } from '../../components/legal/LegalLinks';
import { CITIES } from '../../constants/cities';
import {
  ACCOUNT_KINDS,
  accountKindToRole,
  isValidAccountKind,
} from '../../constants/accountKinds';
import {
  getRegisterConfig,
  normalizeFieldOptions,
} from '../../constants/registerAccountConfig';
import { clearPreviewMode } from '../../constants/preview';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { completePostAuthFlow } from '../../services/authFlow';
import { mapAuthError } from '../../utils/errors';
import { validateStrongPassword } from '../../utils/passwordValidation';

const fieldClassName =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

function RegisterField({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldIcon({ icon: Icon }) {
  if (!Icon) return null;
  return (
    <Icon
      className="pointer-events-none absolute right-3.5 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-slate-400"
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

function TextField({ id, label, icon, value, onChange, placeholder, autoComplete, type = 'text' }) {
  return (
    <RegisterField label={label} id={id}>
      <div className="relative">
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClassName} pr-11`}
        />
        <FieldIcon icon={icon} />
      </div>
    </RegisterField>
  );
}

function SelectField({ id, label, icon: Icon, value, onChange, placeholder, options }) {
  return (
    <RegisterField label={label} id={id}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClassName} appearance-none pr-16`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-slate-400">
          {Icon ? <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.75} aria-hidden /> : null}
          <ChevronDown className="h-4 w-4" aria-hidden />
        </div>
      </div>
    </RegisterField>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, autoComplete, show, onToggle }) {
  return (
    <RegisterField label={label} id={id}>
      <div className="relative">
        <input
          id={id}
          type={onToggle && show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClassName} ${onToggle ? 'pr-[4.25rem]' : 'pr-11'}`}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md p-0.5 text-slate-400 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {show ? (
                <EyeOff className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              ) : (
                <Eye className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              )}
            </button>
          ) : null}
          <Lock
            className="pointer-events-none h-[1.1rem] w-[1.1rem] text-slate-400"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
      </div>
    </RegisterField>
  );
}

function RegisterHeader({ subtitle }) {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <TrabaGEWordmark className="h-9 w-auto sm:h-10" />
      </div>
      <h1 className="mt-5 text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.75rem]">
        Bienvenido a <span className="text-primary-600">TrabaGE</span>
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{subtitle}</p>
      <div className="mx-auto mt-4 h-1.5 w-1.5 rounded-full bg-primary-500" aria-hidden />
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    user,
    isAuthenticated,
    isPreviewMode,
    role,
    getHomePath,
    loading: authLoading,
    refreshAuthState,
  } = useAuth();
  const fromOAuth = location.state?.fromOAuth === true;
  const oauthCompletion = fromOAuth && isAuthenticated && Boolean(user?.id);

  const [accountKind, setAccountKind] = useState(
    location.state?.accountKind && isValidAccountKind(location.state.accountKind)
      ? location.state.accountKind
      : ACCOUNT_KINDS.PERSONAL,
  );
  // Type-specific values (name, sector, institution type) keyed by field key so
  // the three account types share a single, config-driven code path.
  const [typeValues, setTypeValues] = useState({});
  // Common fields — preserved across account-type switches.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const config = getRegisterConfig(accountKind);

  useEffect(() => {
    if (location.state?.accountKind && isValidAccountKind(location.state.accountKind)) {
      setAccountKind(location.state.accountKind);
    }
  }, [location.state?.accountKind]);

  const setTypeValue = (key, value) => {
    setTypeValues((prev) => ({ ...prev, [key]: value }));
  };

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

    authService.rememberPendingAccountType(accountKind);

    const { error: flowError, needsAccountTypeSelection, redirectTo } =
      await completePostAuthFlow(user);

    if (flowError) {
      setError(mapAuthError(flowError));
      setLoading(false);
      return;
    }

    if (needsAccountTypeSelection) {
      setError('No se pudo completar el registro. Inténtalo de nuevo.');
      setLoading(false);
      return;
    }

    await refreshAuthState();
    navigate(redirectTo || '/', { replace: true });
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accountKind) {
      setError('Selecciona un tipo de cuenta.');
      return;
    }

    // Validate ONLY the fields visible for the currently selected account type.
    for (const field of config.fields) {
      if (field.required) {
        const value = typeValues[field.key];
        if (!value || !String(value).trim()) {
          setError(field.requiredMessage);
          return;
        }
      }
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
    const metadata = config.buildMetadata(typeValues, { city: city.trim() });
    const { error: registerError, redirectTo } = await register(email, password, role, metadata);

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

    setLoading(false);
    navigate('/verify-email', { replace: true, state: { email: email.trim().toLowerCase() } });
  };

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && !isPreviewMode && role && !oauthCompletion) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;
  }

  const headerSubtitle = oauthCompletion
    ? 'Elige el tipo de cuenta para completar tu registro.'
    : 'Crea tu cuenta y comienza tu camino profesional.';

  return (
    <div className="min-h-dvh bg-[#ECEEF1]">
      <div
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8 sm:px-6 sm:py-10"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="login-fade-in flex flex-1 flex-col justify-center">
          <RegisterHeader subtitle={headerSubtitle} />

          {fromOAuth && !oauthCompletion ? (
            <div className="login-fade-in-delayed mx-auto mt-4 w-full max-w-md rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Inicia sesión o completa el registro para continuar.
            </div>
          ) : null}

          <div className="login-fade-in-delayed mx-auto mt-6 w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:p-6">
            {oauthCompletion ? (
              <form onSubmit={handleOAuthRoleComplete} className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">Tipo de cuenta</p>
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
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-800">Tipo de cuenta</p>
                    <AccountTypeCards
                      value={accountKind}
                      onChange={setAccountKind}
                      disabled={loading}
                    />
                  </div>

                  {/* Account-type specific fields. Keyed by accountKind so they
                      smoothly animate in on every switch, with no page reload. */}
                  <div key={accountKind} className="register-fields-in space-y-4">
                    {config.fields.map((field) => {
                      const id = `register-${field.key}`;
                      const value = typeValues[field.key] ?? '';

                      if (field.type === 'select') {
                        return (
                          <SelectField
                            key={field.key}
                            id={id}
                            label={field.label}
                            icon={field.icon}
                            placeholder={field.placeholder}
                            options={normalizeFieldOptions(field.options)}
                            value={value}
                            onChange={(next) => setTypeValue(field.key, next)}
                          />
                        );
                      }

                      return (
                        <TextField
                          key={field.key}
                          id={id}
                          label={field.label}
                          icon={field.icon}
                          placeholder={field.placeholder}
                          autoComplete={field.autoComplete}
                          value={value}
                          onChange={(next) => setTypeValue(field.key, next)}
                        />
                      );
                    })}
                  </div>

                  <TextField
                    id="register-email"
                    type="email"
                    label={config.emailLabel}
                    icon={Mail}
                    placeholder={config.emailPlaceholder}
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                  />

                  <PasswordField
                    id="register-password"
                    label="Contraseña"
                    placeholder="Crea una contraseña segura"
                    autoComplete="new-password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((prev) => !prev)}
                  />

                  <PasswordField
                    id="register-confirm-password"
                    label="Confirmar contraseña"
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />

                  <SelectField
                    id="register-city"
                    label="Ciudad"
                    icon={MapPin}
                    placeholder="Selecciona tu ciudad"
                    options={normalizeFieldOptions(CITIES)}
                    value={city}
                    onChange={setCity}
                  />

                  <label className="flex cursor-pointer items-start gap-2.5 pt-0.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs leading-relaxed text-slate-600">
                      Acepto los{' '}
                      <LegalInlineLink to={LEGAL_ROUTES.terms}>
                        Términos y Condiciones
                      </LegalInlineLink>{' '}
                      y la{' '}
                      <LegalInlineLink to={LEGAL_ROUTES.privacy}>
                        Política de Privacidad
                      </LegalInlineLink>
                      .
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
                  <div className="relative flex justify-center text-xs text-slate-500">
                    <span className="bg-white px-3">o regístrate con</span>
                  </div>
                </div>

                <GoogleAuthButton
                  onClick={handleGoogleRegister}
                  label="Continuar con Google"
                />

                <p className="mt-5 text-center text-sm text-slate-500">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary-600 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Inicia sesión
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <ZarrelCredit variant="developed" />
          </div>
        </div>
      </div>
    </div>
  );
}
