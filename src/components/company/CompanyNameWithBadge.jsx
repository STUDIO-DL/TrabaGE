import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { getUserProfilePath } from '../../utils/profileRoutes';

export default function CompanyNameWithBadge({
  company,
  name,
  userId,
  badgeSize = 'sm',
  profile = false,
  className = '',
  nameClassName = 'text-sm text-gray-500',
  showUnverifiedLabel = false,
}) {
  const companyName = name ?? company?.company_name ?? 'Nombre de empresa';
  const verified = isCompanyVerified(company);
  const size = profile ? 'md' : badgeSize;
  const profilePath = getUserProfilePath(userId ?? company?.user_id, 'company');

  const nameElement = profilePath ? (
    <Link
      to={profilePath}
      className={`${nameClassName} hover:text-primary-700 transition-colors`}
    >
      {companyName}
    </Link>
  ) : (
    <span className={nameClassName}>{companyName}</span>
  );

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {nameElement}
      {verified ? (
        <VerifiedBadge size={size} />
      ) : showUnverifiedLabel ? (
        <span className="text-xs text-gray-400">Empresa no verificada</span>
      ) : null}
    </span>
  );
}
