import { Link } from 'react-router-dom';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES, isEmployerRole, rolePath } from '../../constants/roles';
import AppAvatar from '../common/AppAvatar';
import { avatarTypeFromRole } from '../../constants/avatarDefaults';
import SearchBarTrigger from '../search/SearchBarTrigger';
import NotificationBellButton from '../notifications/NotificationBellButton';
import { getDisplayName } from '../../utils/displayIdentity';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';

export default function FeedHeader() {
  const { user, role } = useAuth();
  const { profile } = useProfile();
  const isCompany = isEmployerRole(role);
  const avatarType = avatarTypeFromRole(role, { profile });
  const profilePath = rolePath(role ?? ROLES.PERSONAL, '/profile');
  const showVerifiedBadge = isCompany && isCompanyVerified(profile);
  const displayName = getDisplayName(profile, role, { user, context: 'feed_header' });

  return (
    <header className={topBarOuterClass}>
      <div className={topBarInnerClass}>
        <Link to={profilePath} className="shrink-0" aria-label="Ir a mi perfil">
          <AppAvatar
            type={avatarType}
            src={isCompany ? profile?.logo_path : profile?.avatar_path}
            name={displayName}
            alt={displayName}
            size="sm"
            variant={isCompany ? 'rounded' : 'circular'}
            className={isCompany ? '!h-7 !w-7' : undefined}
          />
        </Link>

        {showVerifiedBadge ? <VerifiedBadge size="sm" className="shrink-0" /> : null}

        <SearchBarTrigger placeholder="Buscar usuarios y empresas…" />

        <NotificationBellButton />
      </div>
    </header>
  );
}
