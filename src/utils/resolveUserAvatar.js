import DefaultUserAvatar from '../assets/default-user-avatar.png';
import { resolveAvatarUrl } from './storagePaths';

export { default as DefaultUserAvatar } from '../assets/default-user-avatar.png';

export function resolveUserAvatar(avatarPath) {
  const resolved = resolveAvatarUrl(avatarPath);
  if (resolved) return resolved;
  if (typeof avatarPath === 'string' && avatarPath.trim().startsWith('http')) return avatarPath.trim();
  return DefaultUserAvatar;
}
