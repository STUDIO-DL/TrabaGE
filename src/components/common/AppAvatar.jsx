import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AvatarType,
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

const DEFAULT_BG = '#F1F5F9';
const BRAND_BLUE = '#2563EB';
const BRAND_BLUE_DEEP = '#1D4ED8';
const BRAND_BLUE_SOFT = '#DBEAFE';
const BRAND_BLUE_MID = '#93C5FD';

function PersonalFallback() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <circle cx="48" cy="36" r="14" fill={BRAND_BLUE} />
      <path d="M22 78c2.8-14.2 14.8-22 26-22s23.2 7.8 26 22" fill={BRAND_BLUE} />
    </svg>
  );
}

function BusinessFallback() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <rect x="28" y="30" width="40" height="42" rx="4" fill={BRAND_BLUE} />
      <rect x="34" y="38" width="8" height="8" rx="1.5" fill={BRAND_BLUE_SOFT} />
      <rect x="46" y="38" width="8" height="8" rx="1.5" fill={BRAND_BLUE_SOFT} />
      <rect x="34" y="50" width="8" height="8" rx="1.5" fill={BRAND_BLUE_SOFT} />
      <rect x="46" y="50" width="8" height="8" rx="1.5" fill={BRAND_BLUE_SOFT} />
      <rect x="40" y="62" width="16" height="10" rx="2" fill={BRAND_BLUE_DEEP} />
      <rect x="42" y="22" width="12" height="8" rx="2" fill={BRAND_BLUE} />
    </svg>
  );
}

function OrganizationFallback() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <path d="M48 22L62 32v40H34V32L48 22Z" fill={BRAND_BLUE} />
      <rect x="42" y="38" width="12" height="26" rx="2" fill={BRAND_BLUE_MID} />
      <rect x="30" y="72" width="36" height="4" rx="2" fill={BRAND_BLUE_DEEP} />
      <circle cx="48" cy="30" r="3" fill={BRAND_BLUE_SOFT} />
      <rect x="38" y="44" width="4" height="12" rx="1" fill="#EFF6FF" />
      <rect x="54" y="44" width="4" height="12" rx="1" fill="#EFF6FF" />
    </svg>
  );
}

function DefaultAvatarMark({ type }) {
  if (type === AvatarType.BUSINESS) return <BusinessFallback />;
  if (type === AvatarType.ORGANIZATION) return <OrganizationFallback />;
  return <PersonalFallback />;
}

/**
 * Unified avatar — valid photo, or TrabaGE default. Never shows a broken <img> icon.
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

  const resolved = useMemo(() => {
    const imagePath =
      src && typeof src === 'object' && typeof src.src === 'string' ? src.src : src;
    // Prefer explicit isDefault from resolveAvatarImageSrc / getDisplayAvatar
    if (src && typeof src === 'object' && src.isDefault === true) {
      return { src: null, isDefault: true };
    }
    return resolveAvatarImageSrc(type, imagePath);
  }, [type, src]);

  const remoteSrc = resolved.isDefault ? null : resolved.src;
  const showImage = Boolean(remoteSrc) && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [type, src, remoteSrc]);

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  const { box, px } = SIZES[size] ?? SIZES.md;
  const shapeClass = VARIANTS[variant] ?? VARIANTS.circular;
  const altText = alt?.trim() || name?.trim() || 'Avatar';

  return (
    <div
      role="img"
      aria-label={altText}
      className={[
        'relative shrink-0 overflow-hidden border border-app-border',
        box,
        shapeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: DEFAULT_BG }}
    >
      {showImage ? (
        <img
          key={remoteSrc}
          src={remoteSrc}
          alt=""
          loading="lazy"
          decoding="async"
          width={px}
          height={px}
          onError={handleError}
          className={[
            'absolute inset-0 block h-full w-full object-cover object-center',
            imageClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : (
        <span className="absolute inset-0 block" aria-hidden>
          <DefaultAvatarMark type={type} />
        </span>
      )}
    </div>
  );
}
