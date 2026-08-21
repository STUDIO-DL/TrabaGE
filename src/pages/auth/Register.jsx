import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AppIcon from '../../components/common/AppIcon';
import Button from '../../components/ui/Button';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import AuthEntryLayout, { AuthDivider, AuthField, AuthPrimaryButton } from '../../components/auth/AuthEntryLayout';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import { LegalInlineLink } from '../../components/legal/LegalLinks';
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from '../../constants/icons';
import {
  ACCOUNT_KINDS,
  accountKindToRole,
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
import { queueWelcomeEmailOnRegistrationComplete } from '../../services/welcomeEmail.service';
import { mapAuthError } from '../../utils/errors';
import { getErrorMessage } from '../../utils/i18n';
import { validateStrongPassword } from '../../utils/passwordValidation';

const selectClassName =
  'h-10 w-full appearance-none rounded-xl border border-[#E2E8F0]/90 bg-white/90 pl-3 pr-9 text-sm text-[#0F172A] outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const selectClassNameDefault =
  'h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white pl-3.5 pr-10 text-[#0F172A] outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const AUTH_ALERT_ERROR =
  'rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700 whitespace-pre-wrap break-words';
const AUTH_ALERT_WARNING =
  'rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800';
function resolveSubmittedEmail(raw) {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  if (!trimmed.includes('@')) return null;
  return trimmed;
}

function SelectField({ id, label, icon: Icon, value, onChange, placeholder, options, compact = true }) {
  return (
    <AuthField id={id} label={label} compact={compact}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={compact ? selectClassName : selectClassNameDefault}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-app-subtle">
        {Icon ? <AppIcon icon={Icon} size={14} aria-hidden /> : null}
        <AppIcon icon={ChevronDown} size={14} aria-hidden />
      </div>
    </AuthField>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  show,
  onToggle,
  compact = true,
}) {
  return (
    <AuthField id={id} label={label} icon={Lock} compact={compact}>
      <input
        id={id}
        type={onToggle && show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full rounded-xl border border-[#E2E8F0]/90 bg-white/90 pl-9 pr-10 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          compact ? 'h-10 text-sm' : 'h-11 pl-10 pr-11',
        ].join(' ')}
      />
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-app-subtle hover:text-primary-600"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <AppIcon icon={show ? EyeOff : Eye} size={16} aria-hidden />
        </button>
      ) : null}
    </AuthField>
  );
}
export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    user,
    session,
    isAuthenticated,
    isPreviewMode,
    role,
    getHomePath,
    loading: authLoading,
    acceptSession,
  } = useAuth();
  const fromOAuth = location.state?.fromOAuth === true;
  const oauthCompletion = fromOAuth && isAuthenticated && Boolean(user?.id);
  const requestedAccountKind = location.state?.accountKind;
  const accountKind = Object.values(ACCOUNT_KINDS).includes(requestedAccountKind)
    ? requestedAccountKind
    : ACCOUNT_KINDS.PERSONAL;
  const businessCreation = location.state?.businessCreation === true && accountKind === ACCOUNT_KINDS.BUSINESS;

  const [typeValues, setTypeValues] = useState(() => {
    const initial = {};
    const fullName = String(location.state?.fullName || '').trim();
    if (fullName) initial.fullName = fullName;
    return initial;
  });
  // Common fields — preserved across account-type switches.
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [legalRepresentative, setLegalRepresentative] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const submitLockRef = useRef(false);

  const config = getRegisterConfig(accountKind);

  useEffect(() => {
    const fullName = String(location.state?.fullName || '').trim();
    if (fullName) {
      setTypeValues((prev) => ({ ...prev, fullName }));
    }
    const prefillEmail = String(location.state?.email || '').trim();
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [location.state?.fullName, location.state?.email]);

  const setTypeValue = (key, value) => {
    setTypeValues((prev) => ({ ...prev, [key]: value }));
  };

  const legalConfirmationsComplete =
    acceptedTerms && confirmedAge && (!businessCreation || legalRepresentative);

  const validateLegalConfirmations = () => {
    if (!acceptedTerms) {
      setError(getErrorMessage('acceptTerms'));
      return false;
    }

    if (!confirmedAge) {
      setError(getErrorMessage('confirmAge'));
      return false;
    }

    if (businessCreation && !legalRepresentative) {
      setError('Confirma que eres representante legal de la empresa.');
      return false;
    }

    return true;
  };

  const handleGoogleRegister = async () => {
    setError('');

    if (!validateLegalConfirmations()) {
      return;
    }

    authService.rememberAccountKind(accountKind);
    authService.rememberPendingAccountType(accountKind);
    clearPreviewMode();
    setGoogleLoading(true);

    try {
      const { error: googleError } = await authService.signupWithGoogle(accountKind);
      if (googleError) {
        setError(mapAuthError(googleError));
        setGoogleLoading(false);
      }
    } catch {
      setError(mapAuthError({ message: 'network error' }));
      setGoogleLoading(false);
    }
  };

  const handleOAuthRoleComplete = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    authService.rememberPendingAccountType(ACCOUNT_KINDS.PERSONAL);

    const { error: flowError, needsAccountTypeSelection, redirectTo, role: flowRole } =
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

    void queueWelcomeEmailOnRegistrationComplete();
    if (session?.user?.id) {
      acceptSession(session, { role: flowRole, redirectTo });
    }
    navigate(redirectTo || '/', { replace: true });
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || loading) return;

    // Validate ONLY the fields visible for personal registration.
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
    if (!submittedEmail) {
      setError(getErrorMessage('invalidEmail'));
      return;
    }

    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setError(getErrorMessage('passwordsMismatch'));
      return;
    }

    if (!validateLegalConfirmations()) {
      return;
    }

    setLoading(true);
    setError('');
    submitLockRef.current = true;

    const role = accountKindToRole(accountKind);
    const metadata = config.buildMetadata(typeValues);
    const { error: registerError, redirectTo, pendingVerification, rateLimited, emailDeliveryFailed } = await register(
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
        emailDeliveryFailed: emailDeliveryFailed === true,
      },
    });
  };

  // Already signed-in users should never see the registration form after login.
  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && !isPreviewMode && role && !oauthCompletion && !businessCreation) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;

  }

  // Hydrating role after login/OAuth — show loader, not the register form.
  // Exception: explicit account-type completion or resume-after-timeout.
  const resumeAccountSetup = Boolean(location.state?.resumeAccountSetup);
  if (
    isAuthenticated &&
    !isPreviewMode &&
    !role &&
    !oauthCompletion &&
    !resumeAccountSetup
  ) {
    return <AuthLoadingScreen />;
  }

  const headerSubtitle = oauthCompletion
    ? 'Completa tu registro personal para continuar.'
    : 'Regístrate para continuar';

  return (
    <AuthEntryLayout
      mode="register"
      density="compact"
      title={oauthCompletion ? 'Completa tu cuenta' : 'Crea tu cuenta'}
      subtitle={headerSubtitle}
    >
      {fromOAuth && !oauthCompletion ? (
        <div className={`mb-3 ${AUTH_ALERT_WARNING}`}>
          Inicia sesión o completa el registro para continuar.
        </div>
      ) : null}

      {oauthCompletion ? (
        <form onSubmit={handleOAuthRoleComplete} className="space-y-3">
          <p className="text-xs leading-relaxed text-[#64748B]">
            Tu cuenta personal en TrabaGE quedará vinculada a tu correo de Google.
          </p>
          {error ? (
            <p role="alert" className={AUTH_ALERT_ERROR}>
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth loading={loading} className="!h-10 !rounded-xl !text-sm !font-semibold">
            Continuar
            <AppIcon icon={ArrowRight} size={16} aria-hidden />
          </Button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-2.5" autoComplete="off">
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
                <AuthField
                  key={field.key}
                  id={id}
                  label={field.label}
                  icon={field.icon || User}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  value={value}
                  onChange={(e) => setTypeValue(field.key, e.target.value)}
                  compact
                />
              );
            })}

            <AuthField
              id="register-email"
              label={config.emailLabel}
              icon={Mail}
              type="email"
              placeholder={config.emailPlaceholder}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              compact
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

            <div className="space-y-1 rounded-lg border border-[#E2E8F0]/70 bg-[#F8FAFC]/70 px-2 py-1.5">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#E2E8F0] text-primary-600 focus:ring-primary-500"
                />
                <span className="text-[10px] leading-snug text-[#64748B]">
                  Acepto los{' '}
                  <LegalInlineLink to={LEGAL_ROUTES.terms}>Términos</LegalInlineLink> y la{' '}
                  <LegalInlineLink to={LEGAL_ROUTES.privacy}>Política de Datos</LegalInlineLink>.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmedAge}
                  onChange={(e) => setConfirmedAge(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#E2E8F0] text-primary-600 focus:ring-primary-500"
                />
                <span className="text-[10px] leading-snug text-[#64748B]">Confirmo que tengo 18+ años</span>
              </label>

              {businessCreation ? (
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={legalRepresentative}
                    onChange={(e) => setLegalRepresentative(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#E2E8F0] text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-[10px] leading-snug text-[#64748B]">
                    Confirmo que soy representante legal de esta empresa.
                  </span>
                </label>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className={AUTH_ALERT_ERROR}>
                {error}
              </p>
            ) : null}

            <AuthPrimaryButton type="submit" disabled={loading || !legalConfirmationsComplete || googleLoading} compact>
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
              ) : (
                <>
                  Crear cuenta
                  <AppIcon icon={ArrowRight} size={18} aria-hidden />
                </>
              )}
            </AuthPrimaryButton>
          </form>

          <AuthDivider compact />

          {!businessCreation ? (
            <GoogleAuthButton
              onClick={handleGoogleRegister}
              label="Continuar con Google"
              disabled={!legalConfirmationsComplete}
              loading={googleLoading}
              compact
            />
          ) : null}
        </>
      )}
    </AuthEntryLayout>
  );
}