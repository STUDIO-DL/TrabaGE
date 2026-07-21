import { Link } from 'react-router-dom';
import UserProfileLink from '../common/UserProfileLink';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import AppIcon from '../common/AppIcon';
import { getUserProfilePath } from '../../utils/profileRoutes';
import { Download, Eye, MessageSquare, ICON_SIZES } from '../../constants/icons';
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
          <p className="text-sm text-gray-500 break-words">{job?.title}</p>
          <Badge variant={status.variant} label={status.label} className="mt-2" />
        </div>
      </div>

      {(coverLetter || answerEntries.length > 0) && (
        <div className="mb-3 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-app-border dark:bg-app-surface">
          {coverLetter ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-app-muted">
                Carta de presentación
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-app-text">
                {coverLetter}
              </p>
            </div>
          ) : null}
          {answerEntries.map((entry) => (
            <div key={entry.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-app-muted">
                {entry.label}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-app-text">
                {entry.value}
              </p>
            </div>
          ))}
        </div>
      )}

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
          onClick={() => onMessage?.(application)}
          loading={messageLoading}
        >
          <AppIcon icon={MessageSquare} size={ICON_SIZES.default} />
          Mensaje
        </Button>
      </div>
    </Card>
  );
}
