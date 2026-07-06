import { Link } from 'react-router-dom';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES } from '../../constants/roles';
import { getCompanyLogoUrl } from '../../constants/images';
import UserAvatar from '../common/UserAvatar';
import Avatar from '../ui/Avatar';
import GlobalSearch from '../search/GlobalSearch';

export default function FeedHeader() {
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

        <GlobalSearch placeholder="Buscar personas, empresas, instituciones…" />
      </div>
    </header>
  );
}
