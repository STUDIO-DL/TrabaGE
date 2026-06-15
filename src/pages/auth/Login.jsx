import { lazy, Suspense, useState } from 'react';
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
import {
  AppleAuthButton,
  GoogleAuthButton,
  LinkedInAuthButton,
} from '../../components/auth/SocialAuthButtons';
import { clearPreviewMode } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';

const LoginCandidateIllustration = lazy(
  () => import('../../components/auth/LoginCandidateIllustration'),
);

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
    { id: ACCOUNT_TYPES.company, label: 'Soy empresa', icon: Building2 },
  ];

  return (
    <div
      role="tablist"
      aria-label="Tipo de cuenta"
      className="mb-7 flex border-b border-slate-200"
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
              'flex flex-1 items-center justify-center gap-2 border-b-[3px] px-3 pb-3 pt-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              isActive
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function LoginMarketing() {
  return (
    <div className="login-fade-in flex h-full min-h-[calc(100dvh-5rem)] flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
      <div>
        <img
          src={logoImg}
          alt="TrabaGE"
          width={140}
          height={34}
          className="h-8 w-auto"
          decoding="async"
        />

        <div className="mt-12 max-w-lg">
          <h1 className="text-[2.35rem] font-bold leading-[1.15] tracking-tight text-[#0F172A] xl:text-[2.65rem]">
            Encuentra el trabajo que
            <br />
            impulsa <span className="text-primary-600">tu futuro</span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-[#64748B]">
            Conecta talento con oportunidades. Empresas y candidatos creciendo juntos.
          </p>

          <ul className="mt-9 space-y-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-[#0F172A]">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#64748B]">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 flex justify-start pt-4">
        <Suspense
          fallback={
            <div
              className="h-[17.5rem] w-full max-w-[21rem] rounded-full bg-primary-50"
              aria-hidden
            />
          }
        >
          <LoginCandidateIllustration />
        </Suspense>
      </div>
    </div>
  );
}

function LoginFooter() {
  return (
    <footer className="shrink-0 border-t border-slate-200/80 bg-[#F8FAFC] px-6 py-5">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-3 text-sm text-[#64748B] md:flex-row">
        <p>© 2024 TrabaGE. Todos los derechos reservados.</p>
        <nav aria-label="Enlaces legales" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
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
  const { login, enterPreviewModeAsRole } = useAuth();
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES.candidate);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExplore = () => {
    enterPreviewModeAsRole(accountType);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <div className="flex flex-1 flex-col lg:flex-row">
        <section
          className="hidden lg:flex lg:w-[45%] lg:shrink-0"
          aria-label="Información sobre TrabaGE"
        >
          <LoginMarketing />
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-10 md:px-8 lg:px-12 lg:py-14">
          <div className="login-fade-in-delayed w-full max-w-[30rem]">
            <div className="mb-8 flex justify-center lg:hidden">
              <img
                src={logoImg}
                alt="TrabaGE"
                width={140}
                height={34}
                className="h-8 w-auto"
                decoding="async"
              />
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
              <div className="px-7 py-8 md:px-9 md:py-9">
                <header className="mb-2">
                  <h2 className="text-[1.65rem] font-bold leading-tight text-[#0F172A]">
                    Iniciar sesión
                  </h2>
                  <p className="mt-1.5 text-sm text-[#64748B]">
                    Bienvenido de nuevo. ¡Nos alegra verte!
                  </p>
                </header>

                <AccountTypeTabs value={accountType} onChange={setAccountType} />

                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
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
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-12 text-sm text-[#0F172A] outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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

                  <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    className="py-3.5 text-base font-semibold"
                  >
                    Iniciar sesión
                  </Button>
                </form>

                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs font-medium text-[#64748B]">
                    <span className="bg-white px-3">o continúa con</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <GoogleAuthButton onClick={() => authService.loginWithGoogle()} />
                  <AppleAuthButton />
                  <LinkedInAuthButton />
                </div>

                <p className="mt-7 text-center text-sm text-[#64748B]">
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
                onClick={handleExplore}
                className="group flex w-full items-center gap-4 border-t border-primary-100 bg-[#EFF6FF] px-7 py-5 text-left transition hover:bg-[#DBEAFE]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 md:px-9"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-primary-100">
                  <Globe className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-primary-700">
                    Explorar sin cuenta
                  </span>
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
          </div>
        </section>
      </div>

      <LoginFooter />
    </div>
  );
}
