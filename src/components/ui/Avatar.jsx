const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
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

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        loading="lazy"
        decoding="async"
        className={`rounded-full border border-slate-200 object-cover ${sizes[size]} ${className}`}
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
        className={`rounded-full border border-slate-200 object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-slate-200 bg-primary-100 font-semibold text-primary-700 ${sizes[size]} ${className}`}
      aria-label={name || 'Avatar'}
    >
      {initials || '?'}
    </div>
  );
}
