import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

const HIDDEN_PREFIXES = ['/login', '/register', '/forgot-password', '/explore', '/onboarding'];

function shouldHideGuestBar(pathname) {
  if (pathname === '/') return true;
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const ROLE_LABELS = {
  [ROLES.PERSONAL]: 'cuenta personal',
  [ROLES.BUSINESS]: 'Business',
  [ROLES.ORGANIZATION]: 'organización',
};

export default function GuestBar() {
  const { isPreviewMode, role } = useAuth();
  const { pathname } = useLocation();

  if (!isPreviewMode || shouldHideGuestBar(pathname)) return null;

  const roleLabel = ROLE_LABELS[role] ?? 'invitado';

  return (
    <div className="sticky top-0 z-[60] border-b border-primary-700 bg-primary-600 text-white shadow-sm" data-guest-bar>
      <div className="mx-auto flex max-w-lg items-center justify-between gap-space-sm px-space-base py-space-sm">
        <p className="min-w-0 flex-1 truncate text-caption sm:text-body-small">
          <span className="font-semibold sm:hidden">{roleLabel}</span>
          <span className="hidden sm:inline">
            Explorando como <span className="font-semibold">{roleLabel}</span> · Solo lectura
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-space-sm">
          <Link
            to="/login"
            className="rounded-radius-sm bg-white px-space-sm py-1.5 text-caption font-semibold text-primary-600 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 sm:px-space-base sm:text-body-small"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="rounded-radius-sm border border-white/70 px-space-sm py-1.5 text-caption font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-space-base sm:text-body-small"
          >
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
