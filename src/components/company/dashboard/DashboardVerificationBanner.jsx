import { Link, useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';
import { getVerificationStatus, isCompanyVerified } from '../../../utils/companyVerification';
import { ROLES, rolePath } from '../../../constants/roles';
import { useAuth } from '../../../hooks/useAuth';
import { exitGuestToAuth } from '../../../utils/guestMode';

/** Only show when action is needed — verified state is silent. */
export default function DashboardVerificationBanner({ profile }) {
  const { role, isPreviewMode } = useAuth();
  const navigate = useNavigate();
  const base = role || ROLES.BUSINESS;

  if (!isPreviewMode && isCompanyVerified(profile)) return null;

  const pending = !isPreviewMode && getVerificationStatus(profile) === 'pending';

  const title = pending ? 'Verificación en revisión' : 'Verifica tu empresa';
  const description = pending
    ? 'Estamos revisando tus documentos.'
    : 'Las empresas verificadas generan mayor confianza dentro de TrabaGE.';
  const cta = pending ? 'Ver estado' : 'Verificar';

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-md border-b border-warning-200/60 pb-space-md">
      <div className="min-w-0">
        <p className="text-body-small font-semibold text-app-text">{title}</p>
        <p className="mt-space-xs text-caption text-app-muted">{description}</p>
      </div>
      {isPreviewMode ? (
        <Button variant="secondary" size="sm" onClick={() => exitGuestToAuth(navigate)}>
          {cta}
        </Button>
      ) : (
        <Link to={rolePath(base, '/verification')}>
          <Button variant="secondary" size="sm">
            {cta}
          </Button>
        </Link>
      )}
    </div>
  );
}
