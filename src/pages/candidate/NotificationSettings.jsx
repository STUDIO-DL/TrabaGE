import NotificationSettingsScreen from '../../components/settings/NotificationSettingsScreen';
import { ROLES } from '../../constants/roles';

export default function CandidateNotificationSettings() {
  return <NotificationSettingsScreen accountType={ROLES.PERSONAL} />;
}
