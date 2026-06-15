import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Bell, ICON_SIZES } from '../../constants/icons';

export default function JobsHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Empleos</h1>
        <Link
          to="/candidate/notifications"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Notificaciones"
        >
          <AppIcon icon={Bell} size={ICON_SIZES.nav} />
        </Link>
      </div>
    </header>
  );
}
