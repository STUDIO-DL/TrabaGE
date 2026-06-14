import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES } from '../../constants/roles';
import UserAvatar from '../common/UserAvatar';
import Avatar from '../ui/Avatar';
import { IconSearch } from '../jobs/JobIcons';

export default function FeedHeader({ query = '', onQueryChange }) {
  const { role } = useAuth();
  const { profile } = useProfile();
  const isCompany = role === ROLES.COMPANY;
  const profilePath = isCompany ? '/company/profile' : '/candidate/profile';

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
        <Link to={profilePath} className="shrink-0" aria-label="Ir a mi perfil">
          {isCompany ? (
            <Avatar
              src={profile?.logo_url}
              name={profile?.company_name}
              size="sm"
              fallback="/images/default-company-logo.png"
              className="!h-8 !w-8"
            />
          ) : (
            <UserAvatar src={profile?.avatar_url} alt={profile?.full_name} size="sm" />
          )}
        </Link>

        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            name="feedSearch"
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar"
            className="w-full rounded-full border-0 bg-gray-100 py-2 pl-9 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>
    </header>
  );
}
