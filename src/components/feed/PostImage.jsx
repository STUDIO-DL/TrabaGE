import { memo } from 'react';

function PostImage({ src, alt = 'Imagen de la publicación', className = '' }) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`mt-space-md w-full rounded-radius-md object-cover ${className}`.trim()}
    />
  );
}

export default memo(PostImage);
