import PageContainer from '../../components/layout/PageContainer';
import { useNavigate } from 'react-router-dom';
import CompanyProfileLayout from '../../components/company/profile/CompanyProfileLayout';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath } from '../../constants/roles';
import { useNotificationContext } from '../../context/NotificationContext';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function Profile() {
  const navigate = useNavigate();
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const base = role || ROLES.BUSINESS;

  const handlePreviewAction = () => {
    showToast(GUEST_MODE_MESSAGE, 'info');
  };

  if (!isPreviewMode && !user?.id) {
    return null;
  }

  return (
    <PageContainer topBar={false}>
      <CompanyProfileLayout
        userId={user?.id}
        isPreviewMode={isPreviewMode}
        onPreviewAction={handlePreviewAction}
        onOpenSettings={() => navigate(rolePath(base, '/settings'))}
      />
    </PageContainer>
  );
}
