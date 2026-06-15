import { Link } from 'react-router-dom';
import UserAvatar from '../common/UserAvatar';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Download, Eye, MessageCircle, ICON_SIZES } from '../../constants/icons';

const STATUS_LABELS = {
  pending: { variant: 'pending', label: 'Pendiente' },
  viewed: { variant: 'default', label: 'Visto' },
  contacted: { variant: 'success', label: 'Contactado' },
  rejected: { variant: 'error', label: 'Rechazado' },
};

export default function ApplicantCard({ application, onDownloadCv, onContact }) {
  const candidate = application.candidate_profiles;
  const job = application.jobs;
  const status = STATUS_LABELS[application.status] || STATUS_LABELS.pending;

  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-start gap-3">
        <UserAvatar src={candidate?.avatar_url} alt={candidate?.full_name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{application.full_name || candidate?.full_name}</p>
          <p className="text-sm text-gray-500">{job?.title}</p>
          <Badge variant={status.variant} label={status.label} className="mt-2" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={`/profile/${application.candidate_id}`}>
          <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5">
            <AppIcon icon={Eye} size={ICON_SIZES.default} />
            Ver perfil
          </Button>
        </Link>
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
          <AppIcon icon={MessageCircle} size={ICON_SIZES.default} />
          Contactar
        </Button>
      </div>
    </Card>
  );
}
