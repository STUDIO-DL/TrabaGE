import VerifiedBadge from './VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';

export default function CompanyNameWithBadge({
  company,
  name,
  badgeSize = 'sm',
  profile = false,
  className = '',
  nameClassName = 'text-sm text-gray-500',
  showUnverifiedLabel = false,
}) {
  const companyName = name ?? company?.company_name ?? 'Nombre de empresa';
  const verified = isCompanyVerified(company);
  const size = profile ? 'md' : badgeSize;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className={nameClassName}>{companyName}</span>
      {verified ? (
        <VerifiedBadge size={size} />
      ) : showUnverifiedLabel ? (
        <span className="text-xs text-gray-400">Empresa no verificada</span>
      ) : null}
    </span>
  );
}
