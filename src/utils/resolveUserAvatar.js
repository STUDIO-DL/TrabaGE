import {
  AvatarType,
  DEFAULT_USER_AVATAR,
  resolveAvatarSrc,
} from '../constants/avatarDefaults';

export { DEFAULT_USER_AVATAR };

/** @deprecated Use resolveAvatarSrc(AvatarType.PERSONAL, avatarPath) from avatarDefaults. */
export function resolveUserAvatar(avatarPath) {
  return resolveAvatarSrc(AvatarType.PERSONAL, avatarPath);
}
