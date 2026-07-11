const sizes = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body-small',
  lg: 'h-14 w-14 text-subtitle',
  xl: 'h-20 w-20 text-title',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ src, name = '', size = 'md', fallback, className = '' }) {
  const initials = getInitials(name);
  const fallbackSrc = fallback || undefined;
  const sizeClass = sizes[size] || sizes.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        loading="lazy"
        decoding="async"
        className={`rounded-radius-circular border border-app-border object-cover ${sizeClass} ${className}`}
      />
    );
  }

  if (fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={name || 'Avatar'}
        loading="lazy"
        decoding="async"
        className={`rounded-radius-circular border border-app-border object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-radius-circular border border-app-border bg-primary-100 font-semibold text-primary-700 ${sizeClass} ${className}`}
      aria-label={name || 'Avatar'}
    >
      {initials || '?'}
    </div>
  );
}
