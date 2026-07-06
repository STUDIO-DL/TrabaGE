import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

const HIDDEN_PREFIXES = ['/login', '/register', '/forgot-password', '/explore', '/onboarding'];

function shouldHideGuestBar(pathname) {
  if (pathname === '/') return true;
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const ROLE_LABELS = {
  [ROLES.CANDIDATE]: 'candidato',
  [ROLES.COMPANY]: 'empresa',
};

export default function GuestBar() {
  const { isPreviewMode, role } = useAuth();
  const { pathname } = useLocation();

  if (!isPreviewMode || shouldHideGuestBar(pathname)) return null;

  const roleLabel = ROLE_LABELS[role] ?? 'invitado';

  return (
    <div className="sticky top-0 z-[60] border-b border-primary-700 bg-primary-600 text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="min-w-0 truncate text-xs sm:text-sm">
          Explorando como <span className="font-semibold">{roleLabel}</span> · Solo lectura
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 sm:px-4 sm:text-sm"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-white/70 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-4 sm:text-sm"
          >
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
