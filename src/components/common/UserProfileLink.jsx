import { Link } from 'react-router-dom';
import AppAvatar from './AppAvatar';
import { AvatarType, avatarTypeFromUserType } from '../../constants/avatarDefaults';
import { getUserProfilePath } from '../../utils/profileRoutes';

const AVATAR_SIZE_CLASS = {
  sm: '!h-8 !w-8',
  md: '!h-10 !w-10',
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
  const avatarType = avatarTypeFromUserType(userType);

  const handleClick = (event) => {
    if (stopPropagation) event.stopPropagation();
  };

  const renderAvatar = () => (
    <AppAvatar
      type={avatarType}
      src={avatar}
      name={name}
      alt={name}
      size={size}
      variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
      className={AVATAR_SIZE_CLASS[size]}
    />
  );

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
