import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/common/EmptyState';
import { JobListSkeleton } from '../../components/common/Skeleton';
import { NoJobs } from '../../assets/empty-states';
import JobCard from '../../components/jobs/JobCard';
import { useSavedJobs } from '../../hooks/useSavedJobs';
import { useNotificationContext } from '../../context/NotificationContext';

export default function SavedJobs() {
  const navigate = useNavigate();
  const { showToast } = useNotificationContext();
  const {
    savedJobs,
    loading,
    actionLoadingId,
    toggleSavedJob,
    isSaved,
  } = useSavedJobs({ loadJobs: true });

  const handleRemove = async (jobId) => {
    const result = await toggleSavedJob(jobId);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  return (
    <PageContainer backButton>
      <div className="space-y-3 p-4">
        {loading ? (
          <JobListSkeleton count={3} />
        ) : savedJobs.length === 0 ? (
          <EmptyState
            image={NoJobs}
            title="No tienes empleos guardados"
            description="Guarda ofertas para revisarlas y aplicar más tarde."
            actionLabel="Ver empleos"
            onAction={() => navigate('/personal/jobs')}
          />
        ) : (
          savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={isSaved(job.id)}
              saving={actionLoadingId === job.id}
              onSaveToggle={() => handleRemove(job.id)}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
