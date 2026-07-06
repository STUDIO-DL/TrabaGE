import NotificationSettingsScreen from '../../components/settings/NotificationSettingsScreen';
import { ROLES } from '../../constants/roles';

export default function CompanyNotificationSettings() {
  return <NotificationSettingsScreen accountType={ROLES.COMPANY} />;
}
