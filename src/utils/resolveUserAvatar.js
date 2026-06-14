import DefaultUserAvatar from '../assets/default-user-avatar.png';

export { default as DefaultUserAvatar } from '../assets/default-user-avatar.png';

export function resolveUserAvatar(src) {
  if (typeof src === 'string' && src.trim()) return src;
  return DefaultUserAvatar;
}
