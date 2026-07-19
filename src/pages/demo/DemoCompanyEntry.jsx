import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShellSkeleton } from '../../components/common/Skeleton';
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

  return <AppShellSkeleton showBottomNav={false} />;
}
