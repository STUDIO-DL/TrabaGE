import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import { getPreviewMode, getPreviewRole } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export default function Explore() {
  const navigate = useNavigate();
  const { enterPreviewModeAsRole } = useAuth();

  useEffect(() => {
    const storedRole = getPreviewRole() || ROLES.CANDIDATE;

    if (!getPreviewMode()) {
      enterPreviewModeAsRole(storedRole);
    }

    const destination =
      storedRole === ROLES.COMPANY ? '/company/feed' : '/candidate/jobs';

    navigate(destination, { replace: true });
  }, [enterPreviewModeAsRole, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC]">
      <Spinner size="lg" />
    </div>
  );
}
