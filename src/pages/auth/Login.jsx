import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import logoImg from '../../assets/branding/logo.png';
import Button from '../../components/ui/Button';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import LoginCandidateIllustration from '../../components/auth/LoginCandidateIllustration';
import { clearPreviewMode } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';

const ACCOUNT_TYPES = {
  candidate: ROLES.CANDIDATE,
  company: ROLES.COMPANY,
};

const FEATURES = [
  {
    icon: Search,
    title: 'Miles de ofertas',
    description: 'Nuevas oportunidades cada día',
  },
  {
    icon: Users,
    title: 'Conecta con empresas',
    description: 'Encuentra el lugar ideal para ti',
  },
  {
    icon: ShieldCheck,
    title: 'Seguro y confiable',
    description: 'Tu información siempre protegida',
  },
];

function AccountTypeTabs({ value, onChange }) {
  const tabs = [
    { id: ACCOUNT_TYPES.candidate, label: 'Soy candidato', icon: User },
    { id: ACCOUNT_TYPES.company, label: 'Soy empresa / institución', icon: Building2 },
  ];

  return (
    <div
      role="tablist"
      aria-label="Tipo de cuenta"
      className="mb-6 flex border-b border-slate-200 md:mb-7"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = value === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-[3px] px-2 pb-3 pt-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:gap-2 sm:px-3 sm:text-sm',
              isActive
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LoginMarketing() {
  return (
    <div className="login-fade-in flex w-full min-w-0 flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 md:min-h-[calc(100dvh-4.75rem)] md:px-10 md:py-10 lg:px-12 xl:px-14 xl:py-12">
      <div className="min-w-0">
        <img
          src={logoImg}
          alt="TrabaGE"
          width={140}
          height={34}
          className="h-8 w-auto"
          decoding="async"
        />

        <div className="mt-6 max-w-lg md:mt-10 lg:mt-12">
          <h1 className="login-headline font-bold tracking-tight text-[#0F172A]">
            Encuentra el trabajo que
            <br />
            impulsa <span className="text-primary-600">tu futuro</span>
          </h1>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#64748B] md:mt-5 md:text-base">
            Conecta talento con oportunidades. Empresas y candidatos creciendo juntos.
          </p>

          <ul className="mt-5 space-y-4 md:mt-8 md:space-y-5 lg:space-y-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex min-w-0 items-start gap-3 md:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0F172A]">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#64748B]">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex w-full justify-center pt-2 md:mt-8 md:justify-start md:pt-6 lg:pt-10">
        <LoginCandidateIllustration />
      </div>
    </div>
  );
}

function LoginCard({
  accountType,
  setAccountType,
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
}) {
  return (
    <div className="login-card login-fade-in-delayed">
      <div className="px-5 py-6 sm:px-7 sm:py-8 md:px-8 md:py-9">
        <header>
          <h2 className="text-[1.4rem] font-bold leading-tight text-[#0F172A] sm:text-[1.65rem]">
            Iniciar sesión
          </h2>
          <p className="mt-1.5 text-sm text-[#64748B]">
            Bienvenido de nuevo. ¡Nos alegra verte!
          </p>
        </header>

        <AccountTypeTabs value={accountType} onChange={setAccountType} />

        <form onSubmit={onSubmit} className="space-y-4 md:space-y-5" autoComplete="off">
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-semibold text-[#0F172A]"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 text-[#94A3B8]"
                aria-hidden
              />
              <input
                id="login-email"
                type="email"
                name="trabage-email"
                autoComplete="email"
                required
                placeholder="tuemail@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:py-3.5 md:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-semibold text-[#0F172A]"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 text-[#94A3B8]"
                aria-hidden
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="trabage-password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-base text-[#0F172A] outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:py-3.5 md:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[#94A3B8] transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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

          <div className="-mt-1 flex justify-end">
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

          <Button type="submit" fullWidth loading={loading} className="py-3.5 text-base font-semibold">
            Iniciar sesión
          </Button>
        </form>

        <div className="relative my-6 md:my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs font-medium text-[#64748B]">
            <span className="bg-white px-3">o continúa con</span>
          </div>
        </div>

        <div className="space-y-3">
          <GoogleAuthButton onClick={onGoogleLogin} />
        </div>

        <p className="mt-6 text-center text-sm text-[#64748B] md:mt-7">
          ¿No tienes una cuenta?{' '}
          <Link
            to="/register"
            state={{ accountType }}
            className="font-bold text-primary-600 transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Regístrate
          </Link>
        </p>
      </div>

      <button
        type="button"
        onClick={onExplore}
        className="group flex w-full min-w-0 items-center gap-3 border-t border-primary-100 bg-[#EFF6FF] px-5 py-4 text-left transition hover:bg-[#DBEAFE]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:gap-4 sm:px-7 sm:py-5 md:px-8"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-primary-100 sm:h-11 sm:w-11">
          <Globe className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-primary-700">Explorar sin cuenta</span>
          <span className="mt-0.5 block text-sm text-[#64748B]">
            Descubre ofertas y empresas sin registrarte
          </span>
        </span>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-primary-600 transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </div>
  );
}

function LoginFooter() {
  return (
    <footer className="shrink-0 border-t border-slate-200/80 bg-[#F8FAFC] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-3 text-center text-xs text-[#64748B] sm:text-sm md:flex-row md:text-left">
        <p>© 2024 TrabaGE. Todos los derechos reservados.</p>
        <nav
          aria-label="Enlaces legales"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:gap-x-3"
        >
          <Link
            to="/legal/terms"
            className="transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Términos y condiciones
          </Link>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <Link
            to="/legal/privacy"
            className="transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Política de privacidad
          </Link>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <Link
            to="/legal/help"
            className="transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Centro de ayuda
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login, enterPreviewMode } = useAuth();
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES.candidate);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(loginError.message || 'No se pudo iniciar sesión');
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

    const { error: googleError } = await authService.loginWithGoogle(accountType);
    if (googleError) {
      setError(googleError.message || 'No se pudo iniciar sesión con Google');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  return (
    <div className="login-shell">
      <div className="login-layout">
        <section className="login-marketing-panel" aria-label="Información sobre TrabaGE">
          <LoginMarketing />
        </section>

        <section className="login-auth-panel" aria-label="Iniciar sesión">
          <LoginCard
            accountType={accountType}
            setAccountType={setAccountType}
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
          />
        </section>
      </div>

      <LoginFooter />
    </div>
  );
}
