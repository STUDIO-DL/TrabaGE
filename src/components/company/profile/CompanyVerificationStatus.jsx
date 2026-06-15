import Badge from '../../ui/Badge';
import AppIcon from '../../common/AppIcon';
import { AlertTriangle, ShieldCheck, ICON_SIZES } from '../../../constants/icons';
import VerifiedBadge from '../VerifiedBadge';
import { getVerificationStatus, isCompanyVerified } from '../../../utils/companyVerification';

const STATUS_MAP = {
  pending: {
    label: 'Verificación pendiente',
    icon: ShieldCheck,
  },
  rejected: {
    label: 'Rechazada',
    icon: AlertTriangle,
  },
  not_submitted: {
    label: 'No verificada',
    icon: AlertTriangle,
  },
};

export default function CompanyVerificationStatus({ company, status, profile = false }) {
  if (isCompanyVerified(company)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <VerifiedBadge size={profile ? 'md' : 'sm'} />
        <Badge variant="verified" label="Empresa Verificada" />
      </span>
    );
  }

  const resolvedStatus = status ?? getVerificationStatus(company);
  const config = STATUS_MAP[resolvedStatus] ?? STATUS_MAP.not_submitted;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <AppIcon icon={config.icon} size={ICON_SIZES.sm} className="text-amber-600" />
      {config.label}
    </span>
  );
}
