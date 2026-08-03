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

const IMAGE_CLASS =
  'absolute inset-0 block h-full w-full object-cover object-center';

/**
 * Unique avatar entry point for the whole app.
 *
 * Always paints the official TrabaGE default underneath.
 * A remote photo (if any) stacks on top and is removed on any load failure
 * (404, network, invalid URL, blocked hotlink). Broken-image icons never show.
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
  const showRemote = Boolean(remoteSrc) && !remoteFailed;

  useEffect(() => {
    setFailedRemoteSrc(null);
  }, [remoteSrc]);

  const handleRemoteError = useCallback(() => {
    if (!remoteSrc) return;
    setFailedRemoteSrc(remoteSrc);
  }, [remoteSrc]);

  const { box, px } = SIZES[size] ?? SIZES.md;
  const shapeClass = VARIANTS[variant] ?? VARIANTS.circular;
  const altText = alt?.trim() || name?.trim() || 'Avatar';
  const stackedClass = [IMAGE_CLASS, imageClassName].filter(Boolean).join(' ');

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
      {/* Base layer — always present so the slot is never empty or broken */}
      <img
        src={defaultSrc}
        alt=""
        width={px}
        height={px}
        draggable={false}
        decoding="async"
        aria-hidden="true"
        className={stackedClass}
      />

      {showRemote ? (
        <img
          key={remoteSrc}
          src={remoteSrc}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={handleRemoteError}
          aria-hidden="true"
          className={stackedClass}
        />
      ) : null}
    </div>
  );
}
