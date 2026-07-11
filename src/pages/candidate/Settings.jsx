import SettingsScreen from '../../components/settings/SettingsScreen';
import { ROLES } from '../../constants/roles';

export default function CandidateSettings() {
  return <SettingsScreen accountType={ROLES.PERSONAL} />;
}
