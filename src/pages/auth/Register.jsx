import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import AccountTypeCards from '../../components/auth/AccountTypeCards';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import { LegalInlineLink } from '../../components/legal/LegalLinks';
import {
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  ICON_SIZES,
} from '../../constants/icons';
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
import { getOnboardingComplete } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { completePostAuthFlow } from '../../services/authFlow';
import { queueWelcomeEmailOnRegistrationComplete } from '../../services/welcomeEmail.service';
import { mapAuthError } from '../../utils/errors';
import { getErrorMessage } from '../../utils/i18n';
import { validateStrongPassword } from '../../utils/passwordValidation';

const fieldClassName =
  'h-input-md w-full min-w-0 rounded-radius-md border border-app-border bg-app-card px-space-base text-body-small text-app-text outline-none transition-colors duration-fast ease-out placeholder:text-app-subtle focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const AUTH_ALERT_ERROR =
  'rounded-radius-md border border-error-200 bg-error-50 px-space-md py-space-sm text-body-small text-error-700';
const AUTH_ALERT_WARNING =
  'rounded-radius-md border border-warning-200 bg-warning-50 px-space-md py-space-sm text-body-small text-warning-800';

function resolveSubmittedEmail(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return `${trimmed}@gmail.com`.toLowerCase();
}

function RegisterField({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-space-sm block text-label font-semibold text-app-text">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldIcon({ icon: Icon }) {
  if (!Icon) return null;
  return (
    <AppIcon
      icon={Icon}
      size={ICON_SIZES.sm}
      className="pointer-events-none absolute right-space-md top-1/2 -translate-y-1/2 text-app-subtle"
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
        <div className="pointer-events-none absolute right-space-md top-1/2 flex -translate-y-1/2 items-center gap-space-sm text-app-subtle">
          {Icon ? <AppIcon icon={Icon} size={ICON_SIZES.sm} strokeWidth={1.75} aria-hidden /> : null}
          <AppIcon icon={ChevronDown} size={ICON_SIZES.sm} aria-hidden />
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
              className="rounded-radius-sm p-space-xs text-app-subtle transition-colors duration-fast ease-out hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <AppIcon icon={show ? EyeOff : Eye} size={ICON_SIZES.sm} aria-hidden />
            </button>
          ) : null}
          <AppIcon
            icon={Lock}
            size={ICON_SIZES.sm}
            className="pointer-events-none text-app-subtle"
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
      <h1 className="mt-space-xl text-heading-l font-bold tracking-tight leading-tight text-app-text">
        BIENVENIDO
      </h1>
      <p className="mx-auto mt-space-sm max-w-sm text-body-small leading-relaxed text-app-muted">{subtitle}</p>
      <div className="mx-auto mt-space-base h-1.5 w-1.5 rounded-radius-circular bg-primary-500" aria-hidden />
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
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

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

    if (accountKind !== ACCOUNT_KINDS.PERSONAL) {
      return;
    }

    if (!accountKind) {
      setError(getErrorMessage('selectAccountType'));
      return;
    }

    // Google signup: personal accounts only. Identity (name, email, avatar)
    // comes from Google after OAuth — no registration form fields.
    authService.rememberAccountKind(accountKind);
    authService.rememberPendingAccountType(accountKind);
    clearPreviewMode();

    const { error: googleError } = await authService.signupWithGoogle(accountKind);
    if (googleError) {
      setError(mapAuthError(googleError));
    }
  };

  const handleOAuthRoleComplete = async (e) => {
    e.preventDefault();

    if (!accountKind) {
      setError(getErrorMessage('selectAccountType'));
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
      setError(getErrorMessage('registerFailed'));
      setLoading(false);
      return;
    }

    await queueWelcomeEmailOnRegistrationComplete();
    await refreshAuthState();
    navigate(redirectTo || '/', { replace: true });
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || loading) return;

    if (!accountKind) {
      setError(getErrorMessage('selectAccountType'));
      return;
    }

    // Validate ONLY the fields visible for the currently selected account type.
    for (const field of config.fields) {
      if (field.required) {
        const value = typeValues[field.key];
        if (!value || !String(value).trim()) {
          setError(getErrorMessage(field.errorKey));
          return;
        }
      }
    }

    if (!email.trim()) {
      setError(getErrorMessage('enterEmail'));
      return;
    }

    const submittedEmail = resolveSubmittedEmail(email);

    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setError(getErrorMessage('passwordsMismatch'));
      return;
    }

    if (!city.trim()) {
      setError(getErrorMessage('selectCity'));
      return;
    }

    if (!acceptedTerms) {
      setError(getErrorMessage('acceptTerms'));
      return;
    }

    setLoading(true);
    setError('');
    submitLockRef.current = true;

    const role = accountKindToRole(accountKind);
    const metadata = config.buildMetadata(typeValues, { city: city.trim() });
    const { error: registerError, redirectTo, pendingVerification, rateLimited } = await register(
      submittedEmail,
      password,
      role,
      metadata,
    );

    submitLockRef.current = false;

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
    navigate('/verify-email', {
      replace: true,
      state: {
        email: submittedEmail,
        accountKind,
        sentAt: Date.now(),
        pendingVerification: pendingVerification === true,
        rateLimited: rateLimited === true,
      },
    });
  };

  // Already signed-in users should never see the registration form after login.
  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated && !isPreviewMode && !oauthCompletion && !getOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isAuthenticated && !isPreviewMode && role && !oauthCompletion) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;
  }

  const headerSubtitle = oauthCompletion
    ? 'Elige el tipo de cuenta para completar tu registro.'
    : 'Crea tu cuenta y comienza tu camino profesional.';

  return (
    <div className="keyboard-scroll-host min-h-dvh overflow-x-hidden overflow-y-auto bg-app-surface">
      <div
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-space-lg py-space-2xl sm:px-space-xl sm:py-space-3xl"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="login-fade-in flex flex-1 flex-col justify-center">
          <RegisterHeader subtitle={headerSubtitle} />

          {fromOAuth && !oauthCompletion ? (
            <div className={`login-fade-in-delayed mx-auto mt-space-base w-full max-w-md ${AUTH_ALERT_WARNING}`}>
              Inicia sesión o completa el registro para continuar.
            </div>
          ) : null}

          <div className="login-card login-fade-in-delayed mx-auto mt-space-xl w-full max-w-md p-space-lg sm:p-space-xl">
            {oauthCompletion ? (
              <form onSubmit={handleOAuthRoleComplete} className="space-y-5">
                <div>
                  <p className="mb-space-md text-label font-semibold text-app-text">Tipo de cuenta</p>
                  <AccountTypeCards value={accountKind} onChange={setAccountKind} disabled={loading} />
                </div>

                {error ? (
                  <p role="alert" className={AUTH_ALERT_ERROR}>
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  size="lg"
                  className="!rounded-radius-md"
                >
                  Continuar
                </Button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <p className="mb-space-md text-label font-semibold text-app-text">Tipo de cuenta</p>
                    <AccountTypeCards
                      value={accountKind}
                      onChange={setAccountKind}
                      disabled={loading}
                    />
                  </div>

                  {/* Account-type specific fields. Keyed by accountKind so they
                      smoothly animate in on every switch, with no page reload. */}
                  <div key={accountKind} className="register-fields-in space-y-space-base">
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

                  <label className="flex cursor-pointer items-start gap-space-sm pt-space-xs">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-radius-sm border-app-border text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-caption leading-relaxed text-app-muted">
                      Acepto los{' '}
                      <LegalInlineLink to={LEGAL_ROUTES.terms}>
                        Términos y Condiciones
                      </LegalInlineLink>{' '}
                      y la{' '}
                      <LegalInlineLink to={LEGAL_ROUTES.privacy}>
                        Política de Uso de Datos
                      </LegalInlineLink>
                      .
                    </span>
                  </label>

                  {error ? (
                    <p role="alert" className={AUTH_ALERT_ERROR}>
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    size="lg"
                    className="!rounded-radius-md"
                  >
                    Crear cuenta
                  </Button>
                </form>

                {accountKind === ACCOUNT_KINDS.PERSONAL ? (
                  <>
                    <div className="relative my-space-lg">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-app-border" />
                      </div>
                      <div className="relative flex justify-center text-caption text-app-subtle">
                        <span className="bg-app-card px-space-md">o regístrate con</span>
                      </div>
                    </div>

                    <GoogleAuthButton
                      onClick={handleGoogleRegister}
                      label="Continuar con Google"
                    />
                  </>
                ) : null}

                <p className="mt-space-lg text-center text-body-small text-app-subtle">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary-600 transition-colors duration-fast ease-out hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Inicia sesión
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="mt-space-2xl flex justify-center">
            <ZarrelCredit variant="developed" />
          </div>
        </div>
      </div>
    </div>
  );
}
