import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { ArrowLeft, ICON_SIZES } from '../../constants/icons';

export const topBarOuterClass =
  'sticky top-0 z-30 border-b border-app-border bg-app-card/95 pt-safe backdrop-blur';

export const topBarInnerClass =
  'mx-auto flex h-topbar w-full max-w-lg items-center gap-space-sm px-space-base md:max-w-2xl lg:max-w-5xl';

export function TopBarShell({ children, className = '' }) {
  return (
    <header className={[topBarOuterClass, className].filter(Boolean).join(' ')}>
      <div className={topBarInnerClass}>{children}</div>
    </header>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-primary-500 transition-colors duration-fast hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-950/40"
      aria-label="Volver"
    >
      <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
    </button>
  );
}

export default function TopBar({ title, backButton = false, actions, leading, center }) {
  const navigate = useNavigate();

  return (
    <TopBarShell>
      {backButton ? <BackButton onClick={() => navigate(-1)} /> : null}
      {leading}
      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-subtitle font-semibold text-app-text">{title}</h1>
      ) : (
        !center && <div className="min-w-0 flex-1" aria-hidden="true" />
      )}
      {center}
      {actions ? <div className="flex shrink-0 items-center gap-space-sm">{actions}</div> : null}
    </TopBarShell>
  );
}
