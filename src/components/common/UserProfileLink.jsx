import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import Avatar from '../ui/Avatar';
import { DEFAULT_COMPANY_LOGO } from '../../constants/images';
import { getUserProfilePath } from '../../utils/profileRoutes';
import { isEmployerAuthor } from '../../constants/authorTypes';

const AVATAR_SIZE_CLASS = {
  sm: '!h-8 !w-8',
  md: '!h-12 !w-12',
};

export default function UserProfileLink({
  userId,
  userType = 'personal',
  name = '',
  avatar,
  headline,
  size = 'md',
  layout = 'row',
  className = '',
  nameClassName = 'font-semibold text-gray-900 hover:text-primary-700 transition-colors',
  stopPropagation = false,
  path: explicitPath,
  children,
}) {
  const path = explicitPath || getUserProfilePath(userId, userType);

  const handleClick = (event) => {
    if (stopPropagation) event.stopPropagation();
  };

  const renderAvatar = () => {
    if (isEmployerAuthor(userType) || userType === 'institution' || userType === 'organization') {
      return (
        <Avatar
          src={avatar}
          name={name}
          size={size}
          fallback={DEFAULT_COMPANY_LOGO}
          className={AVATAR_SIZE_CLASS[size]}
        />
      );
    }
    return <UserAvatar src={avatar} alt={name} size={size} />;
  };

  if (children) {
    if (!path) return children;
    return (
      <Link to={path} className={className} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  if (!path) {
    if (layout === 'avatar') return renderAvatar();
    if (layout === 'name') return <span className={nameClassName}>{name}</span>;
    return (
      <div className={`flex min-w-0 items-center gap-3 ${className}`}>
        {renderAvatar()}
        <div className="min-w-0 flex-1">
          {name && <p className="font-semibold text-gray-900">{name}</p>}
          {headline && <p className="text-sm text-gray-500">{headline}</p>}
        </div>
      </div>
    );
  }

  if (layout === 'avatar') {
    return (
      <Link
        to={path}
        className={`shrink-0 rounded-full ${className}`}
        aria-label={name ? `Ver perfil de ${name}` : 'Ver perfil'}
        onClick={handleClick}
      >
        {renderAvatar()}
      </Link>
    );
  }

  if (layout === 'name') {
    return (
      <Link to={path} className={`${nameClassName} ${className}`} onClick={handleClick}>
        {name}
      </Link>
    );
  }

  return (
    <Link
      to={path}
      className={`flex min-w-0 items-center gap-3 rounded-lg ${className}`}
      onClick={handleClick}
    >
      {renderAvatar()}
      <div className="min-w-0 flex-1">
        {name && <p className={nameClassName}>{name}</p>}
        {headline && <p className="text-sm text-gray-500">{headline}</p>}
      </div>
    </Link>
  );
}
