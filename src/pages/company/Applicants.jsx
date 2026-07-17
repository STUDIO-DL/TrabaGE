import { useMemo, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import ApplicantCard from '../../components/company/ApplicantCard';
import VerifiedBadge from '../../components/company/VerifiedBadge';
import EmptyState from '../../components/common/EmptyState';
import { ApplicationListSkeleton } from '../../components/common/Skeleton';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { applicationsService } from '../../services/applications.service';
import { storageService } from '../../services/storage.service';
import { resolveCvBucket } from '../../utils/storagePaths';
import { profileService } from '../../services/profile.service';
import { openCandidateContact } from '../../utils/contact';
import { isCompanyVerified } from '../../utils/companyVerification';
import { EMPLOYER_APPLICATION_STATUSES } from '../../constants/applicationStatuses';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { TOAST } from '../../utils/copyLabels';

export default function Applicants() {
  const { applications, loading, refetch } = useApplications();
  const { isPreviewMode } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useNotificationContext();
  const verified = isCompanyVerified(profile);
  const [updatingId, setUpdatingId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
      const candidateName = application.candidate_profiles?.full_name || application.full_name || '';
      const jobTitle = application.jobs?.title || '';
      const matchesQuery =
        !normalizedQuery
        || candidateName.toLowerCase().includes(normalizedQuery)
        || jobTitle.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [applications, query, statusFilter]);

  const handleDownloadCv = async (applicationId) => {
    if (isPreviewMode) {
      showToast('Modo vista previa: descarga no disponible', 'info');
      return;
    }

    const { data: cvPathValue } = await applicationsService.getCvPath(applicationId);
    if (!cvPathValue) {
      showToast('No se encontró el CV', 'error');
      return;
    }
    const bucket = resolveCvBucket(cvPathValue);
    const { data } = await storageService.getSignedUrl(bucket, cvPathValue, 900);
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
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast(TOAST.statusUpdated, 'success');
    refetch();
  };

  return (
    <PageContainer
      backButton
      bottomNav={false}
      actions={verified ? <VerifiedBadge size="md" /> : null}
    >
      <div className="p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Buscar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre del candidato u oferta"
          />
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: 'all', label: 'Todos los estados' },
              ...EMPLOYER_APPLICATION_STATUSES.map((status) => ({
                value: status.value,
                label: status.label,
              })),
            ]}
          />
        </div>
        {!loading && (
          <p className="mb-3 text-sm text-gray-500">
            {filteredApplications.length} de {applications.length} postulaciones
          </p>
        )}
        {loading ? (
          <ApplicationListSkeleton count={3} />
        ) : filteredApplications.length === 0 ? (
          <EmptyState
            title="Sin candidatos"
            description={
              applications.length === 0
                ? 'Cuando alguien aplique a tus empleos, aparecerá aquí.'
                : 'No hay candidatos que coincidan con los filtros.'
            }
          />
        ) : (
          filteredApplications.map((app) => (
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
