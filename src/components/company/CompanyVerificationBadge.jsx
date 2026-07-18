import VerifiedBadge from './VerifiedBadge';
import AppIcon from '../common/AppIcon';
import { ShieldCheck, ICON_SIZES } from '../../constants/icons';
import { isCompanyVerified } from '../../utils/companyVerification';
import { getOrgLabels } from '../../utils/orgLabels';

const SIZE_MAP = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

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

  if (verified) {
    return (
      <VerifiedBadge
        size={size}
        tooltip={orgLabels.verified}
        className={className}
      />
    );
  }

  if (readOnly) {
    return null;
  }

  const iconSize = SIZE_MAP[size] ?? SIZE_MAP.sm;
  const tooltip = orgLabels.verified.replace(' verificada', ' no verificada');

  return (
    <span
      className={`inline-flex shrink-0 items-center ${className}`}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-app-surface ring-1 ring-app-border ${iconSize}`}
      >
        <AppIcon icon={ShieldCheck} size={ICON_SIZES.sm} className="text-app-subtle" />
      </span>
    </span>
  );
}
