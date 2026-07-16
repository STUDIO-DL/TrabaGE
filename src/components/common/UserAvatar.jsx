import AppAvatar from './AppAvatar';
import { AvatarType } from '../../constants/avatarDefaults';

/**
 * @deprecated Prefer AppAvatar with type={AvatarType.PERSONAL}. Kept for backward compatibility.
 */
export default function UserAvatar({ src, alt = '', name = '', size = 'md', className = '', imageClassName = '' }) {
  return (
    <AppAvatar
      type={AvatarType.PERSONAL}
      src={src}
      alt={alt}
      name={name}
      size={size}
      className={className}
      imageClassName={imageClassName}
    />
  );
}
