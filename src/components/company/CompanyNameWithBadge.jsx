import { Link } from 'react-router-dom';
import CompanyVerificationBadge from './CompanyVerificationBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { getUserProfilePath } from '../../utils/profileRoutes';
import { getOrgLabels, isOrganizationProfile } from '../../utils/orgLabels';

export default function CompanyNameWithBadge({
  company,
  name,
  userId,
  badgeSize = 'sm',
  profile = false,
  className = '',
  nameClassName = 'text-sm text-gray-500',
  showUnverifiedLabel = false,
  showVerificationBadge = true,
  showOwnerVerificationBadge = false,
  readOnly = false,
  linkToProfile = true,
}) {
  const companyName = name ?? company?.company_name ?? '';
  const verified = isCompanyVerified(company);
  const orgLabels = getOrgLabels(company);
  const unverifiedLabel = isOrganizationProfile(company)
    ? 'Organización no verificada'
    : 'Cuenta Business no verificada';
  const size = profile ? 'md' : badgeSize;
  const profilePath = linkToProfile ? getUserProfilePath(userId ?? company?.user_id, 'company') : null;

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

  const showBadge =
    showVerificationBadge && (verified || (!readOnly && showOwnerVerificationBadge));

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 ${className}`}>
      {nameElement}
      {showBadge ? (
        <CompanyVerificationBadge profile={company} readOnly={readOnly} size={size} />
      ) : showUnverifiedLabel && !verified ? (
        <span className="text-xs text-gray-400">{unverifiedLabel}</span>
      ) : null}
    </span>
  );
}
