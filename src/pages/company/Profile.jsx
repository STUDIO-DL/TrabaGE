import PageContainer from '../../components/layout/PageContainer';
import CompanyProfileLayout from '../../components/company/profile/CompanyProfileLayout';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useNotificationContext } from '../../context/NotificationContext';

export default function Profile() {
  const { user, logout, isPreviewMode } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const { showToast } = useNotificationContext();

  const handlePreviewAction = () => {
    showToast('Modo vista previa: los cambios no se guardan', 'info');
  };

  if (loading) {
    return (
      <PageContainer topBar={false} className="max-w-none">
        <Spinner fullscreen />
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} className="max-w-none">
      <CompanyProfileLayout
        profile={profile}
        userId={user?.id}
        isPreviewMode={isPreviewMode}
        onPreviewAction={handlePreviewAction}
        onLogout={logout}
        onUploadComplete={refetch}
      />
    </PageContainer>
  );
}
