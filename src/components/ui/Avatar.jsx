import AppAvatar from '../common/AppAvatar';
import { AvatarType } from '../../constants/avatarDefaults';

/**
 * @deprecated Prefer AppAvatar with explicit `type`. Kept for backward compatibility.
 */
export default function Avatar({
  src,
  name = '',
  alt = '',
  size = 'md',
  type = AvatarType.BUSINESS,
  variant = 'circular',
  fallback: _fallback,
  className = '',
  imageClassName = '',
}) {
  return (
    <AppAvatar
      type={type}
      src={src}
      name={name}
      alt={alt}
      size={size}
      variant={variant}
      className={className}
      imageClassName={imageClassName}
    />
  );
}
