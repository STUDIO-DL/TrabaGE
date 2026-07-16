import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { ArrowLeft, ICON_SIZES } from '../../constants/icons';

export default function TopBar({ title, backButton = false, actions }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-app-border bg-app-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-space-md px-space-base">
        {backButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
            aria-label="Volver"
          >
            <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
          </button>
        )}
        <h1 className="flex-1 truncate text-body font-semibold text-app-text">{title}</h1>
        {actions && <div className="flex items-center gap-space-sm">{actions}</div>}
      </div>
    </header>
  );
}
