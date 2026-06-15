import AppIcon from '../common/AppIcon';
import { ICON_SIZES, NAV_ICONS } from '../../constants/icons';

export function NavIcon({ name, className = '' }) {
  const Icon = NAV_ICONS[name];
  if (!Icon) return null;
  return <AppIcon icon={Icon} size={ICON_SIZES.nav} className={className} />;
}
