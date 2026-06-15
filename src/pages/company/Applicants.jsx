import PageContainer from '../../components/layout/PageContainer';
import ApplicantCard from '../../components/company/ApplicantCard';
import VerifiedBadge from '../../components/company/VerifiedBadge';
import EmptyState from '../../components/common/EmptyState';
import { ApplicationListSkeleton } from '../../components/common/Skeleton';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { applicationsService } from '../../services/applications.service';
import { storageService } from '../../services/storage.service';
import { isCompanyVerified } from '../../utils/companyVerification';

export default function Applicants() {
  const { applications, loading } = useApplications();
  const { isPreviewMode } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useNotificationContext();
  const verified = isCompanyVerified(profile);

  const handleDownloadCv = async (applicationId) => {
    if (isPreviewMode) {
      showToast('Modo vista previa: descarga no disponible', 'info');
      return;
    }

    const { data: cvPath } = await applicationsService.getCvPath(applicationId);
    if (!cvPath) return;
    const { data } = await storageService.getSignedUrl('candidate-documents', cvPath, 900);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <PageContainer
      title="Candidatos"
      backButton
      bottomNav={false}
      actions={verified ? <VerifiedBadge size="md" /> : null}
    >
      <div className="p-4">
        {loading ? (
          <ApplicationListSkeleton count={3} />
        ) : applications.length === 0 ? (
          <EmptyState
            title="Sin candidatos"
            description="Cuando alguien aplique a tus empleos, aparecerá aquí."
          />
        ) : (
          applications.map((app) => (
            <ApplicantCard
              key={app.id}
              application={app}
              onDownloadCv={handleDownloadCv}
              onContact={() => {}}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
