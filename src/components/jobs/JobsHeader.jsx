import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { TopBarShell } from '../layout/TopBar';
import { Bookmark, Briefcase, ICON_SIZES } from '../../constants/icons';

export default function JobsHeader() {
  return (
    <TopBarShell>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <AppIcon icon={Briefcase} size={ICON_SIZES.md} className="text-app-text" />
        <span className="text-subtitle font-semibold text-app-text">Empleos</span>
      </div>
      <Link
        to="/personal/saved-jobs"
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface"
        aria-label="Empleos guardados"
      >
        <AppIcon icon={Bookmark} size={ICON_SIZES.md} />
      </Link>
    </TopBarShell>
  );
}
