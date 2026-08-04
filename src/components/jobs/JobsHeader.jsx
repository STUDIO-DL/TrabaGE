import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { TopBarShell } from '../layout/TopBar';
import { Bookmark, Briefcase, Plus, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

export default function JobsHeader() {
  const { role, isPreviewMode } = useAuth();
  const canShare = !isPreviewMode && role === ROLES.PERSONAL;

  return (
    <TopBarShell>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <AppIcon icon={Briefcase} size={ICON_SIZES.md} className="text-app-text" />
        <span className="text-subtitle font-semibold text-app-text">Empleos</span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {canShare ? (
          <Link
            to="/personal/opportunities/create"
            className="inline-flex min-h-touch items-center gap-1 rounded-radius-sm px-space-sm text-caption font-semibold text-primary-600 transition-colors duration-fast ease-out hover:bg-app-surface"
            aria-label="Publicar oportunidad compartida"
          >
            <AppIcon icon={Plus} size={ICON_SIZES.sm} />
            <span className="hidden sm:inline">Publicar</span>
          </Link>
        ) : null}
        <Link
          to="/personal/saved-jobs"
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface"
          aria-label="Empleos guardados"
        >
          <AppIcon icon={Bookmark} size={ICON_SIZES.md} />
        </Link>
      </div>
    </TopBarShell>
  );
}
