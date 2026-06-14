import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import VerificationBadge from '../company/VerificationBadge';
import { formatSalary } from '../../utils/formatSalary';

export default function JobCard({ job }) {
  const company = job.company_profiles;

  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-start gap-3">
        <Avatar
          src={company?.logo_url}
          name={company?.company_name}
          size="md"
          fallback="/images/default-company-logo.png"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{company?.company_name}</p>
            <VerificationBadge status={company?.verified_status} />
          </div>
          <p className="text-base font-medium text-gray-800">{job.title}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-500">
        <span>💰 {formatSalary(job.salary)}</span>
        {job.city && <span>📍 {job.city}</span>}
        {job.job_type && <Badge label={job.job_type} />}
      </div>

      <Link to={`/candidate/jobs/${job.id}`}>
        <Button variant="secondary" fullWidth>
          Ver detalles
        </Button>
      </Link>
    </Card>
  );
}
