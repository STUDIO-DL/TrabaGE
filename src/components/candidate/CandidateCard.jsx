import UserProfileLink from '../common/UserProfileLink';
import { getUserProfilePath } from '../../utils/profileRoutes';

const cardClass =
  'surface-card flex items-center gap-space-md p-space-md transition-colors duration-fast hover:border-primary-200 hover:bg-primary-50/40';

export default function CandidateCard({
  candidate,
  subtitle,
  meta,
  onClick,
  className = '',
}) {
  if (!candidate) return null;

  const profilePath = candidate.user_id ? getUserProfilePath(candidate.user_id) : null;

  const avatarLink = profilePath ? (
    <UserProfileLink
      userId={candidate.user_id}
      name={candidate.full_name}
      avatar={candidate.avatar_path}
      layout="avatar"
      size="md"
      stopPropagation={Boolean(onClick)}
    />
  ) : null;

  const nameLink = profilePath ? (
    <UserProfileLink
      userId={candidate.user_id}
      name={candidate.full_name}
      layout="name"
      nameClassName="truncate font-semibold text-app-text transition-colors hover:text-primary-700"
      stopPropagation={Boolean(onClick)}
    />
  ) : (
    <p className="truncate font-semibold text-app-text">{candidate.full_name}</p>
  );

  const details = (
    <>
      {avatarLink}
      <div className="min-w-0 flex-1 text-left">
        {nameLink}
        {subtitle ? <p className="truncate text-body-small text-app-muted">{subtitle}</p> : null}
        {meta ? <p className="mt-space-xs truncate text-caption text-app-subtle">{meta}</p> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <div className={`${cardClass} w-full text-left ${className}`.trim()}>
        {details}
        <button
          type="button"
          onClick={onClick}
          className="ml-auto shrink-0 text-body-small font-medium text-primary-600 hover:text-primary-700"
        >
          Ver
        </button>
      </div>
    );
  }

  return <div className={`${cardClass} ${className}`.trim()}>{details}</div>;
}
