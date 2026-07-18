import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import {
  getVerificationStatus,
  getVerificationStatusLabel,
  isCompanyVerified,
} from '../../../utils/companyVerification';
import { getOrgLabels } from '../../../utils/orgLabels';
import { ROLES, rolePath } from '../../../constants/roles';

export default function CompanyVerificationAction({ company, role = ROLES.BUSINESS, className = '' }) {
  const status = getVerificationStatus(company);
  const verified = isCompanyVerified(company);
  const orgLabels = getOrgLabels(company);
  const verificationPath = rolePath(role, '/verification');
  const label = getVerificationStatusLabel(status, { verifiedLabel: orgLabels.verified });

  if (verified) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled className={className}>
        {label}
      </Button>
    );
  }

  if (status === 'pending') {
    return (
      <Button type="button" variant="secondary" size="sm" disabled className={className}>
        Verificación en revisión
      </Button>
    );
  }

  return (
    <Link to={verificationPath} className={className}>
      <Button type="button" variant="secondary" size="sm">
        Solicitar verificación
      </Button>
    </Link>
  );
}
