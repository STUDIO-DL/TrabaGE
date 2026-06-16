import { Link } from 'react-router-dom';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES } from '../../constants/roles';
import { getCompanyLogoUrl } from '../../constants/images';
import UserAvatar from '../common/UserAvatar';
import Avatar from '../ui/Avatar';
import AppIcon from '../common/AppIcon';
import { Search, ICON_COLORS, ICON_SIZES } from '../../constants/icons';

export default function FeedHeader({ query = '', onQueryChange }) {
  const { role } = useAuth();
  const { profile } = useProfile();
  const isCompany = role === ROLES.COMPANY;
  const profilePath = isCompany ? '/company/profile' : '/candidate/profile';
  const showVerifiedBadge = isCompany && isCompanyVerified(profile);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
        <Link to={profilePath} className="shrink-0" aria-label="Ir a mi perfil">
          {isCompany ? (
            <Avatar
              src={getCompanyLogoUrl(profile?.logo_path)}
              name={profile?.company_name}
              size="sm"
              className="!h-8 !w-8 !rounded-xl"
            />
          ) : (
            <UserAvatar src={profile?.avatar_path} alt={profile?.full_name} size="sm" />
          )}
        </Link>

        {showVerifiedBadge && <VerifiedBadge size="sm" className="shrink-0" />}

        <div className="relative min-w-0 flex-1">
          <AppIcon
            icon={Search}
            size={ICON_SIZES.default}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
          />
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
