import AppAvatar from '../common/AppAvatar';
import VerificationBadge from './VerificationBadge';
import Button from '../ui/Button';
import { avatarTypeFromCompanyProfile } from '../../constants/avatarDefaults';

export default function CompanyHeader({ profile, isOwn = false, onEdit }) {
  const avatarType = avatarTypeFromCompanyProfile(profile);

  return (
    <div className="mb-6 text-center">
      <AppAvatar
        type={avatarType}
        src={profile?.logo_path}
        name={profile?.company_name}
        alt={profile?.company_name}
        size="lg"
        variant="rounded"
        className="mx-auto !rounded-2xl"
      />
      <div className="mt-4 flex items-center justify-center gap-2">
        <h2 className="text-xl font-bold text-gray-900">{profile?.company_name}</h2>
        <VerificationBadge status={profile?.verified_status} />
      </div>
      {profile?.sector && <p className="mt-1 text-sm text-gray-500">{profile.sector}</p>}
      {profile?.city && <p className="mt-1 text-sm text-gray-400">📍 {profile.city}</p>}
      {profile?.description && (
        <p className="mt-4 text-sm text-gray-600">{profile.description}</p>
      )}
      {isOwn && onEdit && (
        <Button variant="secondary" className="mt-4" onClick={onEdit}>
          Editar perfil
        </Button>
      )}
    </div>
  );
}
