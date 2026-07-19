import UserProfileLink from '../common/UserProfileLink';
import { getUserProfilePath } from '../../utils/profileRoutes';

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
      nameClassName="truncate font-semibold text-gray-900 hover:text-primary-700 transition-colors"
      stopPropagation={Boolean(onClick)}
    />
  ) : (
    <p className="truncate font-semibold text-gray-900">{candidate.full_name}</p>
  );

  const details = (
    <>
      {avatarLink}
      <div className="min-w-0 flex-1 text-left">
        {nameLink}
        {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
        {meta && <p className="mt-0.5 truncate text-xs text-gray-400">{meta}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <div
        className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-gray-50 ${className}`}
      >
        {details}
        <button
          type="button"
          onClick={onClick}
          className="ml-auto shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Ver
        </button>
      </div>
    );
  }

  if (profilePath) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:bg-gray-50 ${className}`}
      >
        {details}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${className}`}>
      {details}
    </div>
  );
}
