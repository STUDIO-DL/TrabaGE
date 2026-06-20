import { Link } from 'react-router-dom';
import UserAvatar from '../common/UserAvatar';
import { getUserProfilePath } from '../../utils/profileRoutes';

export default function CandidateCard({
  candidate,
  subtitle,
  meta,
  onClick,
  className = '',
}) {
  if (!candidate) return null;

  const content = (
    <>
      <UserAvatar src={candidate.avatar_path} alt={candidate.full_name} size="md" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-semibold text-gray-900">{candidate.full_name}</p>
        {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
        {meta && <p className="mt-0.5 truncate text-xs text-gray-400">{meta}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-gray-50 ${className}`}
      >
        {content}
      </button>
    );
  }

  const profilePath = candidate.user_id ? getUserProfilePath(candidate.user_id) : null;

  if (profilePath) {
    return (
      <Link
        to={profilePath}
        className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:bg-gray-50 ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${className}`}>
      {content}
    </div>
  );
}
