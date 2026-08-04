import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

const HIDDEN_PREFIXES = ['/login', '/register', '/forgot-password', '/explore', '/welcome', '/onboarding'];

function shouldHideGuestBar(pathname) {
  if (pathname === '/') return true;
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const ROLE_LABELS = {
  [ROLES.PERSONAL]: 'personal',
  [ROLES.BUSINESS]: 'empresa',
  [ROLES.ORGANIZATION]: 'organización',
};

/** Guest chrome — soft brand wash + primary Entrar (not a loud CTA strip). */
export default function GuestBar() {
  const { isPreviewMode, role } = useAuth();
  const { pathname } = useLocation();

  if (!isPreviewMode || shouldHideGuestBar(pathname)) return null;

  const roleLabel = ROLE_LABELS[role] ?? 'invitado';

  return (
    <div
      className="sticky top-0 z-[60] border-b border-primary-100 bg-primary-50/90 text-app-text backdrop-blur-md"
      data-guest-bar
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-space-sm px-space-base py-2 md:max-w-2xl lg:max-w-5xl">
        <p className="min-w-0 flex-1 truncate text-caption text-primary-800/80">
          Vista previa · {roleLabel}
        </p>
        <div className="flex shrink-0 items-center gap-space-base">
          <Link
            to="/register"
            className="text-caption font-medium text-primary-700/80 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Crear cuenta
          </Link>
          <Link
            to="/login"
            className="rounded-radius-sm bg-primary-600 px-space-sm py-1 text-caption font-semibold text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
