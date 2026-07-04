import SettingsScreen from '../../components/settings/SettingsScreen';
import { ROLES } from '../../constants/roles';

export default function CompanySettings() {
  return <SettingsScreen accountType={ROLES.COMPANY} />;
}
