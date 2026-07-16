import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { TopBarShell } from '../layout/TopBar';
import { Bookmark, ICON_SIZES } from '../../constants/icons';

export default function JobsHeader() {
  return (
    <TopBarShell>
      <div className="min-w-0 flex-1" aria-hidden="true" />
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
