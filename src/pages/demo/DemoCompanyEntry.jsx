import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { clearPreviewMode } from '../../constants/preview';
import { useAuth } from '../../hooks/useAuth';

export default function DemoCompanyEntry() {
  const navigate = useNavigate();
  const { enterPreviewModeAsRole } = useAuth();

  useEffect(() => {
    clearPreviewMode();
    enterPreviewModeAsRole(ROLES.BUSINESS);
    navigate(ROLE_HOME[ROLES.BUSINESS], { replace: true });
  }, [enterPreviewModeAsRole, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
