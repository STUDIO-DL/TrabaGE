import VerifiedBadge from './VerifiedBadge';
import Badge from '../ui/Badge';
import AppIcon from '../common/AppIcon';
import { ShieldCheck, ICON_SIZES } from '../../constants/icons';
import { getVerificationStatus, isCompanyVerified } from '../../utils/companyVerification';

const STATUS_MAP = {
  pending: { variant: 'pending', label: 'Pendiente', icon: ShieldCheck },
  rejected: { variant: 'error', label: 'Rechazada', icon: ShieldCheck },
  not_submitted: null,
  approved: null,
};

export default function VerificationBadge({ company, status = 'unverified' }) {
  if (isCompanyVerified(company)) {
    return <VerifiedBadge size="sm" />;
  }

  const resolvedStatus = getVerificationStatus(company ?? { verified_status: status });
  const config = STATUS_MAP[resolvedStatus];
  if (!config) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <AppIcon icon={config.icon} size={ICON_SIZES.sm} className="text-amber-700" />
      <Badge variant={config.variant} label={config.label} />
    </span>
  );
}
