import Avatar from '../ui/Avatar';
import VerificationBadge from './VerificationBadge';
import Button from '../ui/Button';

export default function CompanyHeader({ profile, isOwn = false, onEdit }) {
  return (
    <div className="mb-6 text-center">
      <Avatar
        src={profile?.logo_url}
        name={profile?.company_name}
        size="lg"
        fallback="/images/default-company-logo.png"
        className="mx-auto rounded-2xl"
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
