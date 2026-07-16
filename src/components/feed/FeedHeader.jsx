import { Link } from 'react-router-dom';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES, isEmployerRole, rolePath } from '../../constants/roles';
import AppAvatar from '../common/AppAvatar';
import { avatarTypeFromRole } from '../../constants/avatarDefaults';
import GlobalSearch from '../search/GlobalSearch';
import NotificationBellButton from '../notifications/NotificationBellButton';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';

export default function FeedHeader() {
  const { role } = useAuth();
  const { profile } = useProfile();
  const isCompany = isEmployerRole(role);
  const avatarType = avatarTypeFromRole(role, { profile });
  const profilePath = rolePath(role ?? ROLES.PERSONAL, '/profile');
  const showVerifiedBadge = isCompany && isCompanyVerified(profile);

  return (
    <header className={topBarOuterClass}>
      <div className={topBarInnerClass}>
        <Link to={profilePath} className="shrink-0" aria-label="Ir a mi perfil">
          <AppAvatar
            type={avatarType}
            src={isCompany ? profile?.logo_path : profile?.avatar_path}
            name={isCompany ? profile?.company_name : profile?.full_name}
            alt={isCompany ? profile?.company_name : profile?.full_name}
            size="sm"
            variant={isCompany ? 'rounded' : 'circular'}
            className={isCompany ? '!h-7 !w-7' : undefined}
          />
        </Link>

        {showVerifiedBadge ? <VerifiedBadge size="sm" className="shrink-0" /> : null}

        <GlobalSearch placeholder="Buscar personas, Business y organizaciones…" />

        <NotificationBellButton />
      </div>
    </header>
  );
}
