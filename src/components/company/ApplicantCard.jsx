import { Link } from 'react-router-dom';
import UserProfileLink from '../common/UserProfileLink';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import AppIcon from '../common/AppIcon';
import { getUserProfilePath } from '../../utils/profileRoutes';
import { Download, Eye, Phone, ICON_SIZES } from '../../constants/icons';
import {
  EMPLOYER_APPLICATION_STATUSES,
  getApplicationStatus,
} from '../../constants/applicationStatuses';

export default function ApplicantCard({
  application,
  onDownloadCv,
  onContact,
  onStatusChange,
  statusUpdating = false,
}) {
  const candidate = application.candidate_profiles;
  const job = application.jobs;
  const status = getApplicationStatus(application.status);
  const profilePath = getUserProfilePath(application.candidate_id, 'personal');

  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-start gap-3">
        <UserProfileLink
          userId={application.candidate_id}
          name={application.full_name || candidate?.full_name}
          avatar={candidate?.avatar_path}
          layout="avatar"
        />
        <div className="min-w-0 flex-1">
          <UserProfileLink
            userId={application.candidate_id}
            name={application.full_name || candidate?.full_name}
            layout="name"
            nameClassName="font-semibold text-gray-900 hover:text-primary-700 transition-colors"
          />
          <p className="text-sm text-gray-500">{job?.title}</p>
          <Badge variant={status.variant} label={status.label} className="mt-2" />
        </div>
      </div>

      <div className="mb-3">
        <Select
          label="Estado"
          value={application.status}
          onChange={(e) => onStatusChange?.(application.id, e.target.value)}
          disabled={statusUpdating}
          options={EMPLOYER_APPLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {profilePath ? (
          <Link to={profilePath}>
            <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5">
              <AppIcon icon={Eye} size={ICON_SIZES.default} />
              Ver perfil
            </Button>
          </Link>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-1.5"
          onClick={() => onDownloadCv?.(application.id)}
        >
          <AppIcon icon={Download} size={ICON_SIZES.default} />
          Descargar CV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-1.5"
          onClick={() => onContact?.(application)}
        >
          <AppIcon icon={Phone} size={ICON_SIZES.default} />
          Contactar
        </Button>
      </div>
    </Card>
  );
}
