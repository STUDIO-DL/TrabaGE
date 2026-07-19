import VerifiedBadge from './VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { getOrgLabels } from '../../utils/orgLabels';

/**
 * Verification badge for company/organization profile headers.
 * - Owner view: always visible (blue when verified, subtle gray when not).
 * - Public view: only when verified (returns null otherwise).
 */
export default function CompanyVerificationBadge({
  profile,
  readOnly = false,
  size = 'sm',
  className = '',
}) {
  const verified = isCompanyVerified(profile);
  const orgLabels = getOrgLabels(profile);

  if (readOnly && !verified) {
    return null;
  }

  const tooltip = verified
    ? orgLabels.verified
    : orgLabels.verified.replace(' verificada', ' no verificada');

  return (
    <VerifiedBadge
      size={size}
      verified={verified}
      tooltip={tooltip}
      className={className}
    />
  );
}
