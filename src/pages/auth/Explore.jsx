import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../../components/common/AppIcon';
import TrabaGEWordmark from '../../components/branding/TrabaGEWordmark';
import {
  ArrowRight,
  Building2,
  Lock,
  User,
  ICON_SIZES,
} from '../../constants/icons';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { getPreviewMode } from '../../constants/preview';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

const ROLE_OPTIONS = [
  {
    id: ROLES.PERSONAL,
    label: 'Cuenta personal',
    description: 'Explora ofertas de empleo, Business y oportunidades.',
    icon: User,
  },
  {
    id: ROLES.BUSINESS,
    label: 'Business / Organización',
    description: 'Explora el panel, publicaciones y talento interesado.',
    icon: Building2,
  },
];

export default function Explore() {
  const navigate = useNavigate();
  const { enterPreviewMode, enterPreviewModeAsRole } = useAuth();

  useEffect(() => {
    if (!getPreviewMode()) {
      enterPreviewMode();
    }
  }, [enterPreviewMode]);

  const selectRole = (role) => {
    enterPreviewModeAsRole(role);
    navigate(ROLE_HOME[role], { replace: true });
  };

  return (
    <div className="login-shell">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-space-base py-space-xl sm:max-w-lg sm:px-space-lg sm:py-space-2xl">
        <div className="login-fade-in flex flex-1 flex-col items-center justify-center">
          <TrabaGEWordmark size="hero" className="mx-auto" />

          <h1 className="mt-space-xl text-center text-[1.65rem] font-bold tracking-tight text-app-text sm:mt-space-2xl sm:text-[1.85rem]">
            ¿Cómo quieres explorar?
          </h1>

          <p className="mx-auto mt-space-md max-w-[22rem] text-center text-body-small leading-relaxed text-app-muted">
            Elige tu experiencia. Puedes navegar libremente, pero necesitarás una cuenta
            para interactuar.
          </p>

          <div className="mt-space-xl flex w-full flex-col gap-space-md sm:mt-space-2xl">
            {ROLE_OPTIONS.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectRole(id)}
                className={[
                  'group flex w-full cursor-pointer items-center gap-space-md rounded-[1.125rem]',
                  'border border-app-border bg-app-card px-space-md py-space-md text-left',
                  'shadow-[0_4px_20px_rgb(var(--app-shadow)/0.06)]',
                  'transition-[border-color,box-shadow,transform,background-color] duration-fast ease-out',
                  'hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/35',
                  'hover:shadow-[0_12px_28px_rgb(var(--app-shadow)/0.1)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
                  'active:translate-y-0 active:scale-[0.995]',
                  'sm:gap-space-base sm:px-space-lg sm:py-space-lg',
                ].join(' ')}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100 transition-colors group-hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-800/50">
                  <AppIcon icon={Icon} size={ICON_SIZES.md} strokeWidth={1.9} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold tracking-tight text-app-text">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-body-small leading-snug text-app-muted">
                    {description}
                  </span>
                </span>

                <AppIcon
                  icon={ArrowRight}
                  size={ICON_SIZES.md}
                  className="shrink-0 text-primary-600 transition-transform duration-fast group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </button>
            ))}
          </div>

          <p className="mt-space-xl text-center text-body-small text-app-muted sm:mt-space-2xl">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1 font-semibold text-primary-600 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Iniciar sesión
              <AppIcon icon={ArrowRight} size={ICON_SIZES.sm} strokeWidth={2.25} />
            </button>
          </p>
        </div>

        <footer className="login-fade-in-delayed mt-space-xl shrink-0 pb-space-sm text-center">
          <p className="inline-flex items-center justify-center gap-space-xs px-space-sm text-caption leading-snug text-app-muted">
            <AppIcon icon={Lock} size={14} className="shrink-0 text-app-subtle" strokeWidth={2} />
            <span>
              Seguro, confiable y hecho para conectar{' '}
              <span className="font-medium text-primary-600">talento y empresas.</span>
            </span>
          </p>
          <nav
            className="mt-space-sm flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] text-app-subtle"
            aria-label="Enlaces legales"
          >
            <Link
              to={LEGAL_ROUTES.terms}
              className="transition hover:text-primary-600"
            >
              Términos y condiciones
            </Link>
            <span aria-hidden>·</span>
            <Link
              to={LEGAL_ROUTES.privacy}
              className="transition hover:text-primary-600"
            >
              Política de privacidad
            </Link>
            <span aria-hidden>·</span>
            <span>TrabaGE © {new Date().getFullYear()}</span>
          </nav>
        </footer>
      </div>
    </div>
  );
}
