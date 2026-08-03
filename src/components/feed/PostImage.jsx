import { memo, useState } from 'react';

function PostImage({ src, alt = 'Imagen de la publicación', className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onError={() => setFailed(true)}
      className={`mt-space-md w-full rounded-radius-md object-cover ${className}`.trim()}
    />
  );
}

export default memo(PostImage);
