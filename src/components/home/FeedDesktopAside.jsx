import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { rolePath } from '../../constants/roles';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';

/**
 * Optional desktop rail for the feed — secondary context, not primary content.
 */
export default function FeedDesktopAside() {
  const { role } = useAuth();

  const links = [
    { suffix: '/jobs', label: 'Explorar empleos', hint: 'Ofertas activas cerca de ti' },
    { suffix: '/discover/people', label: 'Descubrir personas', hint: 'Amplía tu red profesional' },
    { suffix: '/notifications', label: 'Notificaciones', hint: 'Actividad reciente' },
  ];

  return (
    <aside className="hidden w-[280px] shrink-0 lg:block" aria-label="Atajos">
      <div className="sticky top-4 space-y-space-md">
        <div className="rounded-radius-lg border border-primary-100 bg-primary-50/60 p-space-md">
          <TrabaGEWordmark size="sm" />
          <p className="mt-space-xs text-caption leading-relaxed text-primary-800/80">
            Conecta, publica y encuentra oportunidades en Guinea Ecuatorial.
          </p>
        </div>

        <nav className="overflow-hidden rounded-radius-lg border border-app-border bg-app-card">
          <ul className="divide-y divide-app-divider">
            {links.map(({ suffix, label, hint }) => (
              <li key={suffix}>
                <Link
                  to={rolePath(role, suffix)}
                  className="block px-space-md py-space-sm transition-colors hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                >
                  <span className="block text-body-small font-medium text-primary-700">{label}</span>
                  <span className="mt-0.5 block text-caption text-app-subtle">{hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
