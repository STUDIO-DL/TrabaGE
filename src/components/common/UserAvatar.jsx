import { resolveUserAvatar, DefaultUserAvatar } from '../../utils/resolveUserAvatar';

const SIZES = {
  sm: { box: 'h-8 w-8', px: 32 },
  md: { box: 'h-12 w-12', px: 48 },
  lg: { box: 'h-[72px] w-[72px]', px: 72 },
  xl: { box: 'h-[120px] w-[120px]', px: 120 },
};

export default function UserAvatar({ src, alt = '', size = 'md', className = '', imageClassName = '' }) {
  const hasCustomAvatar = typeof src === 'string' && src.trim().length > 0;
  const avatarSrc = resolveUserAvatar(src);
  const isDefaultAvatar = avatarSrc === DefaultUserAvatar;
  const altText = alt?.trim() ? alt : 'Avatar de usuario';
  const { box, px } = SIZES[size] ?? SIZES.md;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 ${box} ${className}`}
    >
      <img
        src={avatarSrc}
        alt={altText}
        loading="lazy"
        decoding="async"
        width={px}
        height={px}
        className={[
          'absolute inset-0 block h-full w-full object-cover object-center',
          isDefaultAvatar && !hasCustomAvatar ? 'scale-[1.12]' : '',
          imageClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
