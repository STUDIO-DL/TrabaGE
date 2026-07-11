import Button from '../ui/Button';
import AppIcon from './AppIcon';
import { ICON_SIZES, ICON_STROKE } from '../../constants/icons';

export default function EmptyState({
  image,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  imageAlt,
  variant = 'default',
}) {
  const alt = imageAlt ?? title;
  const isSoft = variant === 'soft';

  return (
    <div
      className={[
        'mx-auto flex w-full max-w-[400px] flex-col items-center px-space-xl py-space-3xl text-center sm:py-space-4xl',
        isSoft ? '' : 'bg-app-card',
      ].join(' ')}
      role="status"
    >
      {isSoft && icon ? (
        <span
          className="mb-space-xl flex h-[72px] w-[72px] items-center justify-center rounded-radius-circular bg-app-primary-soft/70 ring-1 ring-inset ring-app-border/40 dark:bg-app-primary-soft/25"
          aria-hidden="true"
        >
          <AppIcon
            icon={icon}
            size={ICON_SIZES.xl}
            className="text-app-subtle dark:text-app-muted"
            strokeWidth={ICON_STROKE.thin}
          />
        </span>
      ) : image ? (
        isSoft ? (
          <span className="mb-space-xl flex items-center justify-center rounded-radius-lg bg-app-primary-soft/50 p-space-lg ring-1 ring-inset ring-app-border/30 dark:bg-app-primary-soft/20">
            <img
              src={image}
              alt={alt}
              className="max-w-[140px] object-contain opacity-80 saturate-[0.65] contrast-[0.95] mix-blend-multiply dark:mix-blend-normal dark:opacity-70"
              loading="lazy"
              decoding="async"
            />
          </span>
        ) : (
          <img
            src={image}
            alt={alt}
            className="mb-space-xl w-full max-w-[260px] object-contain"
            loading="lazy"
            decoding="async"
          />
        )
      ) : null}

      <h2 className="text-title text-app-text sm:text-heading-m">{title}</h2>

      {description && (
        <p className="mt-space-md text-body-small leading-relaxed text-app-muted">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button type="button" className="mt-space-2xl min-w-[160px]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
