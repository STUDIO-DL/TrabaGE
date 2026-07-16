import Card from '../ui/Card';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { getJobTypeLabel } from '../../constants/jobTypes';
import { getWorkModeLabel } from '../../constants/workModes';

function buildLocationLine(job) {
  const parts = [job?.city, getJobTypeLabel(job?.job_type), getWorkModeLabel(job?.work_mode)].filter(
    Boolean,
  );
  return parts.join(' · ');
}

export default function ApplyJobSummary({ job }) {
  if (!job) return null;

  const locationLine = buildLocationLine(job);

  return (
    <Card padding="md" aria-label="Resumen de la oferta">
      <h2 className="text-button font-semibold text-app-text">{job.title}</h2>
      <CompanyNameWithBadge
        company={job.company_profiles}
        showUnverifiedLabel
        className="mt-space-xs"
        nameClassName="text-body-small text-app-muted"
      />
      {locationLine ? (
        <p className="mt-space-sm text-body-small text-app-muted">{locationLine}</p>
      ) : null}
    </Card>
  );
}
