import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import { getVerificationStatus, isCompanyVerified } from '../../../utils/companyVerification';
import { ROLES, rolePath } from '../../../constants/roles';
import { useAuth } from '../../../hooks/useAuth';

/** Only show when action is needed — verified state is silent. */
export default function DashboardVerificationBanner({ profile }) {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;

  if (isCompanyVerified(profile)) return null;

  const pending = getVerificationStatus(profile) === 'pending';

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-md border-b border-warning-200/60 pb-space-md">
      <div className="min-w-0">
        <p className="text-body-small font-semibold text-app-text">
          {pending ? 'Verificación en revisión' : 'Verifica tu empresa'}
        </p>
        <p className="mt-space-xs text-caption text-app-muted">
          {pending
            ? 'Estamos revisando tus documentos.'
            : 'Las cuentas verificadas generan más confianza.'}
        </p>
      </div>
      <Link to={rolePath(base, '/verification')}>
        <Button variant="secondary" size="sm">
          {pending ? 'Ver estado' : 'Verificar'}
        </Button>
      </Link>
    </div>
  );
}
