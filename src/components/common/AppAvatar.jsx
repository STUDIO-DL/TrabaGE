import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AvatarType,
  getDefaultAvatarSrc,
  resolveAvatarImageSrc,
} from '../../constants/avatarDefaults';

const SIZES = {
  sm: { box: 'h-7 w-7', px: 28, text: 'text-caption' },
  md: { box: 'h-9 w-9', px: 36, text: 'text-body-small' },
  lg: { box: 'h-12 w-12', px: 48, text: 'text-subtitle' },
  xl: { box: 'h-[5rem] w-[5rem]', px: 80, text: 'text-title' },
  '2xl': { box: 'h-[7.5rem] w-[7.5rem]', px: 120, text: 'text-heading-m' },
};

const VARIANTS = {
  circular: 'rounded-radius-circular',
  rounded: 'rounded-radius-md',
};

/**
 * Unified avatar component — single entry point for personal, business and organization avatars.
 */
export default function AppAvatar({
  type = AvatarType.PERSONAL,
  src,
  name = '',
  alt = '',
  size = 'md',
  variant = 'circular',
  className = '',
  imageClassName = '',
}) {
  const [imageError, setImageError] = useState(false);
  const defaultSrc = getDefaultAvatarSrc(type);

  const resolved = useMemo(() => resolveAvatarImageSrc(type, src), [type, src]);
  const displaySrc = imageError ? defaultSrc : resolved.src;
  const isDefault = imageError || resolved.isDefault;

  useEffect(() => {
    setImageError(false);
  }, [type, src]);

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  const { box, px } = SIZES[size] ?? SIZES.md;
  const shapeClass = VARIANTS[variant] ?? VARIANTS.circular;
  const altText = alt?.trim() || name?.trim() || 'Avatar';

  return (
    <div
      className={[
        'relative shrink-0 overflow-hidden border border-app-border bg-slate-100 dark:bg-slate-800/80',
        box,
        shapeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img
        src={displaySrc}
        alt={altText}
        loading="lazy"
        decoding="async"
        width={px}
        height={px}
        onError={handleError}
        className={[
          'absolute inset-0 block h-full w-full object-cover object-center',
          isDefault && type === AvatarType.PERSONAL ? 'scale-[1.12]' : '',
          imageClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
