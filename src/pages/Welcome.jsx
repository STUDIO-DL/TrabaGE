import { Link, Navigate, useNavigate } from 'react-router-dom';
import AppIcon from '../components/common/AppIcon';
import AuthLoadingScreen from '../components/auth/AuthLoadingScreen';
import TrabaGEWordmark from '../components/branding/TrabaGEWordmark';
import { LegalInlineLink } from '../components/legal/LegalLinks';
import Button from '../components/ui/Button';
import {
  ABOUT_ROUTE,
  APP_INFO_ROUTE,
  LEGAL_ROUTES,
} from '../constants/legalRoutes';
import { SUPPORT_EMAIL } from '../constants/support';
import {
  Bell,
  Briefcase,
  Building2,
  Check,
  FileText,
  Lock,
  ShieldCheck,
  User,
  Users,
  ICON_SIZES,
} from '../constants/icons';
import { useAuth } from '../hooks/useAuth';

const AUDIENCES = [
  {
    icon: User,
    title: 'Cuentas personales',
    description:
      'Crea tu perfil profesional, explora y guarda ofertas, postúlate con tu CV y conecta con empresas e instituciones.',
  },
  {
    icon: Building2,
    title: 'Business y Organizaciones',
    description:
      'Publica ofertas, gestiona postulaciones, completa tu perfil de entidad y solicita verificación documental.',
  },
];

const FEATURES = [
  {
    icon: Briefcase,
    title: 'Empleo y postulaciones',
    description: 'Explora ofertas, guárdalas y postúlate con perfil, CV y formularios de la empresa.',
  },
  {
    icon: Users,
    title: 'Networking profesional',
    description: 'Sigue Business y Organizaciones, publica en el feed y amplía tu red.',
  },
  {
    icon: Building2,
    title: 'Empresas verificadas',
    description: 'Entidades que acreditan su existencia legal con documentación revisada.',
  },
  {
    icon: Bell,
    title: 'Alertas y avisos',
    description: 'Notificaciones sobre ofertas, estado de postulaciones y seguridad de la cuenta.',
  },
];

const GOOGLE_AUTH_POINTS = [
  {
    title: 'Qué datos pedimos',
    text: 'Nombre, correo electrónico y foto de perfil que Google nos autoriza a obtener.',
  },
  {
    title: 'Para qué',
    text: 'Autenticarte de forma segura y crear o vincular tu cuenta personal en TrabaGE.',
  },
  {
    title: 'Uso limitado',
    text: 'Solo para acceso e identidad en la plataforma. No vendemos ni alquilamos tus datos.',
  },
  {
    title: 'Qué no accedemos',
    text: 'No leemos Gmail, Drive, Calendar ni contactos de Google.',
  },
];

const OTHER_DATA_POINTS = [
  {
    icon: FileText,
    text: 'Cuenta y perfil: datos que facilitas para operar tu perfil personal o de entidad.',
  },
  {
    icon: Briefcase,
    text: 'Postulaciones: compartimos tu perfil y documentos con la empresa a la que aplicas.',
  },
  {
    icon: Bell,
    text: 'Notificaciones: avisos relevantes sobre oportunidades, postulaciones y seguridad.',
  },
];

const FOOTER_LINKS = [
  { label: 'Sobre nosotros', to: ABOUT_ROUTE },
  { label: 'Contacto', href: `mailto:${SUPPORT_EMAIL}` },
  { label: 'Preguntas frecuentes', to: APP_INFO_ROUTE },
];

const footerLinkClass =
  'text-body-small text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-sm';

const footerLegalClass =
  'font-medium text-primary-300 underline decoration-primary-500/40 underline-offset-2 transition hover:text-primary-200 hover:decoration-primary-300';

export default function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated, role, getHomePath, loading, isPreviewMode } = useAuth();

  if (loading && !isPreviewMode) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && !isPreviewMode && role) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;
  }

  const handleContinue = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div
      className="min-h-dvh w-full overflow-x-hidden bg-app-bg text-app-text"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-space-sm px-space-base py-space-base sm:px-space-lg lg:px-space-2xl">
        <TrabaGEWordmark size="lg" />
        <Button
          type="button"
          variant="text"
          size="sm"
          onClick={handleLogin}
          className="!min-h-0 !h-auto shrink-0 px-space-sm py-1.5 text-body-small font-medium text-primary-600"
        >
          Iniciar sesión
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-space-base sm:px-space-lg lg:px-space-2xl">
        {/* Hero — brand identity */}
        <section className="pb-space-2xl pt-space-lg sm:pb-space-3xl sm:pt-space-xl lg:max-w-xl lg:pt-space-2xl">
          <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-app-text sm:text-[2.5rem] lg:text-[3rem]">
            Conecta.
            <br />
            Descubre.
            <br />
            <span className="text-primary-600">Crece.</span>
          </h1>

          <p className="mt-space-lg max-w-md text-body leading-relaxed text-app-muted sm:text-[1.0625rem]">
            <span className="font-semibold text-app-text">TrabaGE</span> es la plataforma de empleo
            y networking profesional de{' '}
            <span className="font-medium text-primary-600">Guinea Ecuatorial</span>
            {' '}— para talento, Business y Organizaciones.
          </p>

          <Button
            type="button"
            size="lg"
            onClick={handleContinue}
            className="mt-space-xl min-w-[10.5rem] px-space-2xl sm:mt-space-2xl"
          >
            Comenzar
          </Button>
        </section>

        {/* Propósito — explícito para revisión Google OAuth / App Homepage */}
        <section
          className="border-t border-app-border/70 py-space-2xl lg:py-space-3xl"
          aria-labelledby="welcome-purpose-heading"
        >
          <h2
            id="welcome-purpose-heading"
            className="text-title font-semibold tracking-tight text-app-text"
          >
            Propósito de TrabaGE
          </h2>
          <div className="mt-space-sm max-w-2xl space-y-space-sm text-body-small leading-relaxed text-app-muted sm:text-body">
            <p>
              El propósito de TrabaGE es conectar talento con empleo y oportunidades profesionales
              en Guinea Ecuatorial: un marketplace laboral digital donde personas, Business y
              Organizaciones se encuentran.
            </p>
            <p>
              Las personas usan TrabaGE para crear un perfil profesional, buscar y guardar ofertas,
              postularse con su CV y hacer networking. Las empresas y organizaciones lo usan para
              publicar ofertas, gestionar postulaciones y conectar con candidatos.
            </p>
            <p>
              TrabaGE facilita perfiles, ofertas, postulaciones, feed profesional y follows; no
              interviene en la contratación final.
            </p>
          </div>

          <div className="mt-space-xl grid grid-cols-1 gap-space-base sm:grid-cols-2 sm:gap-space-lg">
            {AUDIENCES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-radius-lg border border-app-border bg-app-card px-space-lg py-space-lg"
              >
                <div className="flex items-center gap-space-sm">
                  <AppIcon
                    icon={Icon}
                    size={ICON_SIZES.lg}
                    className="text-primary-600"
                    strokeWidth={1.75}
                  />
                  <h3 className="text-body font-semibold tracking-tight text-app-text">{title}</h3>
                </div>
                <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Funcionalidades */}
        <section
          className="grid grid-cols-1 gap-space-xl border-t border-app-border/70 py-space-2xl sm:grid-cols-2 sm:gap-space-xl lg:grid-cols-4 lg:gap-space-lg lg:py-space-3xl"
          aria-label="Funcionalidades"
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-space-sm">
              <AppIcon
                icon={Icon}
                size={ICON_SIZES.xl}
                className="text-primary-600"
                strokeWidth={1.75}
              />
              <h2 className="text-body font-semibold tracking-tight text-app-text">{title}</h2>
              <p className="text-body-small leading-relaxed text-app-muted">{description}</p>
            </div>
          ))}
        </section>

        {/* Google Sign-In — transparencia OAuth */}
        <section
          className="border-t border-app-border/70 py-space-2xl lg:py-space-3xl"
          aria-labelledby="welcome-google-heading"
        >
          <div className="rounded-radius-lg border border-app-border bg-app-card px-space-lg py-space-xl sm:px-space-xl">
            <div className="flex items-center gap-space-sm">
              <AppIcon
                icon={Lock}
                size={ICON_SIZES.lg}
                className="text-primary-600"
                strokeWidth={1.9}
              />
              <h2
                id="welcome-google-heading"
                className="text-title font-semibold tracking-tight text-app-text"
              >
                Google Sign-In y tus datos
              </h2>
            </div>

            <p className="mt-space-md max-w-3xl text-body-small leading-relaxed text-app-muted sm:text-body">
              Las cuentas personales pueden registrarse e iniciar sesión con Google. Business y
              Organizaciones usan correo y contraseña.
            </p>

            <ul className="mt-space-lg max-w-3xl space-y-space-md">
              {GOOGLE_AUTH_POINTS.map(({ title, text }) => (
                <li key={title} className="flex items-start gap-space-sm">
                  <AppIcon
                    icon={Check}
                    size={ICON_SIZES.md}
                    className="mt-0.5 shrink-0 text-primary-600"
                    strokeWidth={2.25}
                  />
                  <span className="text-body-small leading-relaxed text-app-text">
                    <span className="font-semibold">{title}: </span>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Privacidad — resumen + enlaces legales */}
        <section
          className="border-t border-app-border/70 py-space-2xl lg:py-space-3xl"
          aria-labelledby="welcome-privacy-heading"
        >
          <div className="flex items-center gap-space-sm">
            <AppIcon
              icon={ShieldCheck}
              size={ICON_SIZES.lg}
              className="text-primary-600"
              strokeWidth={1.9}
            />
            <h2
              id="welcome-privacy-heading"
              className="text-title font-semibold tracking-tight text-app-text"
            >
              Privacidad en TrabaGE
            </h2>
          </div>

          <p className="mt-space-md max-w-3xl text-body-small leading-relaxed text-app-muted sm:text-body">
            Además del acceso con Google, tratamos solo los datos necesarios para prestar el
            servicio:
          </p>

          <ul className="mt-space-lg max-w-3xl space-y-space-md">
            {OTHER_DATA_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-space-sm">
                <AppIcon
                  icon={Icon}
                  size={ICON_SIZES.md}
                  className="mt-0.5 shrink-0 text-primary-600"
                  strokeWidth={1.9}
                />
                <span className="text-body-small leading-relaxed text-app-text">{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-space-xl text-body-small leading-relaxed text-app-muted">
            Detalle completo en la{' '}
            <LegalInlineLink to={LEGAL_ROUTES.privacy}>Política de privacidad</LegalInlineLink>
            {' '}y los{' '}
            <LegalInlineLink to={LEGAL_ROUTES.terms}>Términos y condiciones</LegalInlineLink>
            . Soporte:{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 transition hover:text-primary-700 hover:decoration-primary-400"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto grid w-full max-w-6xl gap-space-xl px-space-base py-space-2xl sm:grid-cols-2 sm:px-space-lg lg:grid-cols-3 lg:gap-space-2xl lg:px-space-2xl lg:py-space-3xl">
          <div className="sm:col-span-2 lg:col-span-1">
            <span
              className="inline-flex items-baseline text-body font-semibold tracking-tight"
              aria-label="TrabaGE"
            >
              <span className="text-white">Traba</span>
              <span className="text-primary-400">GE</span>
            </span>
            <p className="mt-space-sm max-w-xs text-body-small leading-relaxed text-slate-400">
              Conecta talento con oportunidades en Guinea Ecuatorial.
            </p>
            <p className="mt-space-md text-body-small text-slate-400">
              <a href={`mailto:${SUPPORT_EMAIL}`} className={footerLinkClass}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>

          <div>
            <h3 className="text-body-small font-semibold text-white">Enlaces</h3>
            <ul className="mt-space-sm space-y-space-sm">
              {FOOTER_LINKS.map((item) => (
                <li key={item.label}>
                  {item.to ? (
                    <Link to={item.to} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} className={footerLinkClass}>
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-body-small font-semibold text-white">Legal</h3>
            <ul className="mt-space-sm space-y-space-sm">
              <li>
                <Link to={LEGAL_ROUTES.privacy} className={footerLegalClass}>
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link to={LEGAL_ROUTES.terms} className={footerLegalClass}>
                  Términos y condiciones
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="border-t border-slate-700/80 px-space-base py-space-base text-center text-caption text-slate-400">
          © 2025 TrabaGE. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
