import AppIcon from '../common/AppIcon';
import { Settings, ICON_SIZES } from '../../constants/icons';

export default function ProfileSettingsButton({ onClick }) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-500 transition-colors duration-fast ease-out hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 active:scale-[0.97] dark:text-primary-400 dark:hover:bg-primary-950/40"
      aria-label="Configuración"
    >
      <AppIcon icon={Settings} size={ICON_SIZES.default} strokeWidth={2} />
    </button>
  );
}
