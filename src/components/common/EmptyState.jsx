import Button from '../ui/Button';
import AppIcon from './AppIcon';
import { ICON_SIZES } from '../../constants/icons';

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
      className={`mx-auto flex w-full max-w-[400px] flex-col items-center px-6 py-10 text-center sm:py-12${
        isSoft ? '' : ' bg-white'
      }`}
      role="status"
    >
      {isSoft && icon ? (
        <span
          className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-app-primary-soft/70 ring-1 ring-inset ring-app-border/40 dark:bg-app-primary-soft/25"
          aria-hidden="true"
        >
          <AppIcon
            icon={icon}
            size={ICON_SIZES.nav + 8}
            className="text-app-subtle dark:text-app-muted"
            strokeWidth={1.5}
          />
        </span>
      ) : image ? (
        isSoft ? (
          <span className="mb-6 flex items-center justify-center rounded-2xl bg-app-primary-soft/50 p-5 ring-1 ring-inset ring-app-border/30 dark:bg-app-primary-soft/20">
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
            className="mb-6 w-full max-w-[260px] object-contain"
            loading="lazy"
            decoding="async"
          />
        )
      ) : null}

      <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">{title}</h2>

      {description && (
        <p className="mt-3 text-sm leading-relaxed text-gray-500 sm:text-[15px]">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button type="button" className="mt-8 min-w-[160px]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
