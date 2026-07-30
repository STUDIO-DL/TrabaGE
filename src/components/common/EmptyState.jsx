import Button from '../ui/Button';

/**
 * Typography-first empty state. Illustrations optional and restrained.
 * Answers: what is empty, why it matters, what to do next.
 */
export default function EmptyState({
  image,
  icon: _icon,
  title,
  description,
  actionLabel,
  onAction,
  imageAlt,
  variant = 'default',
}) {
  const alt = imageAlt ?? title;
  const showImage = Boolean(image) && variant !== 'text';

  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col items-center px-space-base py-space-2xl text-center sm:py-space-3xl"
      role="status"
    >
      {showImage ? (
        <img
          src={image}
          alt={alt}
          className="mb-space-lg max-h-24 w-auto max-w-[7.5rem] object-contain opacity-70"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <h2 className="text-title font-semibold tracking-tight text-app-text">{title}</h2>

      {description ? (
        <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">{description}</p>
      ) : null}

      {actionLabel && onAction ? (
        <Button type="button" className="mt-space-lg" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
