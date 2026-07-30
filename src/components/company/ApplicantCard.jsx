import { Link } from 'react-router-dom';
import UserProfileLink from '../common/UserProfileLink';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import AppIcon from '../common/AppIcon';
import { getUserProfilePath } from '../../utils/profileRoutes';
import { Download, Eye, ICON_SIZES } from '../../constants/icons';
import MessagesChatIcon from '../messages/MessagesChatIcon';
import {
  EMPLOYER_APPLICATION_STATUSES,
  getApplicationStatus,
} from '../../constants/applicationStatuses';

function parseCustomQuestions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAnswerEntries(application) {
  const questions = parseCustomQuestions(application?.jobs?.custom_questions);
  const answers = application?.custom_answers;
  if (!answers || typeof answers !== 'object') return [];

  const labelById = new Map(
    questions.map((q, index) => {
      if (typeof q === 'string') return [`q${index + 1}`, q];
      return [q.id || `q${index + 1}`, q.question || q.label || `Pregunta ${index + 1}`];
    }),
  );

  return Object.entries(answers)
    .filter(([, value]) => String(value ?? '').trim())
    .map(([id, value]) => ({
      id,
      label: labelById.get(id) || id,
      value: String(value).trim(),
    }));
}

export default function ApplicantCard({
  application,
  onDownloadCv,
  onMessage,
  messageLoading = false,
  onStatusChange,
  statusUpdating = false,
}) {
  const candidate = application.candidate_profiles;
  const job = application.jobs;
  const status = getApplicationStatus(application.status);
  const profilePath = getUserProfilePath(application.candidate_id, 'personal');
  const coverLetter = String(application.additional_notes ?? '').trim();
  const answerEntries = getAnswerEntries(application);

  return (
    <Card className="mb-space-sm">
      <div className="mb-space-sm flex items-start gap-space-md">
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
            nameClassName="font-semibold text-app-text transition-colors hover:text-primary-700"
          />
          <p className="break-words text-body-small text-app-muted">{job?.title}</p>
          <Badge variant={status.variant} label={status.label} className="mt-space-sm" />
        </div>
      </div>

      {(coverLetter || answerEntries.length > 0) && (
        <div className="mb-space-sm space-y-space-sm rounded-radius-md border border-app-divider bg-app-surface p-space-sm">
          {coverLetter ? (
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-app-muted">
                Carta de presentación
              </p>
              <p className="mt-space-xs whitespace-pre-wrap break-words text-body-small text-app-text">
                {coverLetter}
              </p>
            </div>
          ) : null}
          {answerEntries.map((entry) => (
            <div key={entry.id}>
              <p className="text-caption font-semibold uppercase tracking-wide text-app-muted">
                {entry.label}
              </p>
              <p className="mt-space-xs whitespace-pre-wrap break-words text-body-small text-app-text">
                {entry.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-space-sm">
        <Select
          label="Estado"
          value={application.status}
          onChange={(e) => onStatusChange?.(application.id, e.target.value)}
          disabled={statusUpdating}
          options={EMPLOYER_APPLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        />
      </div>

      <div className="flex flex-wrap gap-space-sm">
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
          onClick={() => onMessage?.(application)}
          loading={messageLoading}
        >
          <AppIcon icon={MessagesChatIcon} size={ICON_SIZES.default} />
          Mensaje
        </Button>
      </div>
    </Card>
  );
}
