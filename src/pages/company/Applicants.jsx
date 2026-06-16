import { useState } from 'react';
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
import { profileService } from '../../services/profile.service';
import { openCandidateContact } from '../../utils/contact';
import { isCompanyVerified } from '../../utils/companyVerification';

export default function Applicants() {
  const { applications, loading, refetch } = useApplications();
  const { isPreviewMode } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useNotificationContext();
  const verified = isCompanyVerified(profile);
  const [updatingId, setUpdatingId] = useState(null);

  const handleDownloadCv = async (applicationId) => {
    if (isPreviewMode) {
      showToast('Modo vista previa: descarga no disponible', 'info');
      return;
    }

    const { data: cvPath } = await applicationsService.getCvPath(applicationId);
    if (!cvPath) {
      showToast('No se encontró el CV', 'error');
      return;
    }
    const { data } = await storageService.getSignedUrl('candidate-documents', cvPath, 900);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else showToast('No se pudo descargar el CV', 'error');
  };

  const handleContact = async (application) => {
    if (isPreviewMode) {
      showToast('Modo vista previa: contacto no disponible', 'info');
      return;
    }

    const { data: candidateProfile } = await profileService.getCandidateProfile(application.candidate_id);
    const { ok, error } = openCandidateContact(candidateProfile);
    if (!ok) showToast(error, 'error');
  };

  const handleStatusChange = async (applicationId, status) => {
    if (isPreviewMode) {
      showToast('Modo vista previa: acción no disponible', 'info');
      return;
    }

    setUpdatingId(applicationId);
    const { error } = await applicationsService.updateStatus(applicationId, status);
    setUpdatingId(null);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('Estado actualizado', 'success');
    refetch();
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
              onContact={handleContact}
              onStatusChange={handleStatusChange}
              statusUpdating={updatingId === app.id}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
