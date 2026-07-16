import Badge from '../ui/Badge';
import { getApplicationStatus } from '../../constants/applicationStatuses';

export default function ApplicationStatusBadge({ status, className = '' }) {
  const config = getApplicationStatus(status);

  return <Badge variant={config.variant} label={config.label} className={className} />;
}
