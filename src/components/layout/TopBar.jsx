import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, backButton = false, actions }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-app-border bg-app-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        {backButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-app-muted hover:bg-app-surface"
            aria-label="Volver"
          >
            ←
          </button>
        )}
        <h1 className="flex-1 truncate text-base font-semibold text-app-text">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
