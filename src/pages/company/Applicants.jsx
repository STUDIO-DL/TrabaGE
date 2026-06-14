import PageContainer from '../../components/layout/PageContainer';
import ApplicantCard from '../../components/company/ApplicantCard';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { useApplications } from '../../hooks/useApplications';
import { applicationsService } from '../../services/applications.service';
import { storageService } from '../../services/storage.service';

export default function Applicants() {
  const { applications, loading } = useApplications();

  const handleDownloadCv = async (applicationId) => {
    const { data: cvPath } = await applicationsService.getCvPath(applicationId);
    if (!cvPath) return;
    const { data } = await storageService.getSignedUrl('candidate-documents', cvPath, 900);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <PageContainer title="Candidatos" backButton bottomNav={false}>
      <div className="p-4">
        {loading ? (
          <Spinner fullscreen />
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
