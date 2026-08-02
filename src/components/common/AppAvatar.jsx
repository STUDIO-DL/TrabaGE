import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AvatarType,
  getDefaultAvatarSrc,
  resolveAvatarImageSrc,
} from '../../constants/avatarDefaults';

const SIZES = {
  sm: { box: 'h-7 w-7', px: 28 },
  md: { box: 'h-9 w-9', px: 36 },
  lg: { box: 'h-12 w-12', px: 48 },
  xl: { box: 'h-[5rem] w-[5rem]', px: 80 },
  '2xl': { box: 'h-[7.5rem] w-[7.5rem]', px: 120 },
};

const VARIANTS = {
  circular: 'rounded-radius-circular',
  rounded: 'rounded-radius-md',
};

/**
 * Unique avatar entry point for the whole app.
 * Valid photo → show it. Missing / invalid / onError → official TrabaGE default.
 * Never shows broken icons, initials, or empty circles.
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
  const [failedRemoteSrc, setFailedRemoteSrc] = useState(null);

  const resolved = useMemo(() => {
    if (src && typeof src === 'object' && src.isDefault === true) {
      return { src: null, isDefault: true };
    }
    const imagePath =
      src && typeof src === 'object' && typeof src.src === 'string' ? src.src : src;
    return resolveAvatarImageSrc(type, imagePath);
  }, [type, src]);

  const defaultSrc = getDefaultAvatarSrc(type);
  const remoteSrc = resolved.isDefault ? null : resolved.src;
  const remoteFailed = Boolean(remoteSrc) && failedRemoteSrc === remoteSrc;
  const showDefault = !remoteSrc || remoteFailed;
  const displaySrc = showDefault ? defaultSrc : remoteSrc;

  useEffect(() => {
    setFailedRemoteSrc(null);
  }, [type, src]);

  const handleError = useCallback(() => {
    if (!remoteSrc || showDefault) return;
    setFailedRemoteSrc(remoteSrc);
  }, [remoteSrc, showDefault]);

  const { box, px } = SIZES[size] ?? SIZES.md;
  const shapeClass = VARIANTS[variant] ?? VARIANTS.circular;
  const altText = alt?.trim() || name?.trim() || 'Avatar';

  return (
    <div
      role="img"
      aria-label={altText}
      className={[
        'relative shrink-0 overflow-hidden bg-transparent',
        box,
        shapeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img
        key={displaySrc}
        src={displaySrc}
        alt=""
        loading="lazy"
        decoding="async"
        width={px}
        height={px}
        draggable={false}
        onError={handleError}
        className={[
          'absolute inset-0 block h-full w-full object-cover object-center',
          imageClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
