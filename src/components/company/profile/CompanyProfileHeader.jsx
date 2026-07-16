import { useRef } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  AlertTriangle,
  Camera,
  Pencil,
  Upload,
  ICON_SIZES,
} from '../../../constants/icons';
import CompanyVerificationStatus from './CompanyVerificationStatus';
import VerifiedBadge from '../VerifiedBadge';
import AppAvatar from '../../common/AppAvatar';
import { avatarTypeFromCompanyProfile } from '../../../constants/avatarDefaults';
import { getCompanyCoverUrl } from '../../../constants/images';
import {
  getCompanyDisplayName,
  getCompanyLocationText,
  getCompanySectorText,
} from '../../../utils/companyProfile';
import { isCompanyVerified } from '../../../utils/companyVerification';
import { formatFollowerNumber } from '../../../utils/formatFollowerCount';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import CompanyProfileActionBar from './CompanyProfileActionBar';

function MediaUploadButton({ label, loading, inputId, className = '' }) {
  return (
    <label
      htmlFor={inputId}
      className={`inline-flex min-h-touch cursor-pointer items-center gap-space-xs rounded-radius-full bg-app-card/95 px-space-md py-space-xs text-caption font-semibold text-primary-700 shadow-elevation-1 ring-1 ring-app-border backdrop-blur transition-colors duration-fast hover:bg-app-card has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${className}`}
    >
      <AppIcon icon={Camera} size={ICON_SIZES.sm} className="text-primary-600" />
      {loading ? 'Subiendo…' : label}
    </label>
  );
}

export default function CompanyProfileHeader({
  profile,
  readOnly = false,
  onEditName,
  onUploadLogo,
  onUploadCover,
  logoLoading = false,
  coverLoading = false,
  followerCount = 0,
  showFollowerCount = false,
  showActions = false,
  showFollow = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  onViewJobs,
  hasJobs = false,
  shareUrl,
  shareTitle,
  reportTargetId,
  onContact,
  contactDisabled = false,
}) {
  const { role } = useAuth();
  const logoInputRef = useRef(null);
  const coverInputId = 'company-cover-input';
  const name = getCompanyDisplayName(profile);
  const avatarType = avatarTypeFromCompanyProfile(profile);
  const coverSrc = getCompanyCoverUrl(profile?.cover_url);
  const sector = getCompanySectorText(profile);
  const city = profile?.city?.trim();
  const sectorCity = [sector !== 'Sector no especificado' ? sector : null, city]
    .filter(Boolean)
    .join(' · ');

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onUploadLogo?.(file);
    event.target.value = '';
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onUploadCover?.(file);
    event.target.value = '';
  };

  return (
    <section className="bg-app-card">
      <div className="relative h-28 overflow-hidden sm:h-32">
        {coverSrc ? (
          <img src={coverSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800" />
        )}

        {!readOnly && (
          <>
            <input
              id={coverInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={coverLoading}
              onChange={handleCoverChange}
            />
            <MediaUploadButton
              label={coverSrc ? 'Cambiar portada' : 'Añadir portada'}
              inputId={coverInputId}
              loading={coverLoading}
              className="absolute bottom-space-sm right-space-base z-10"
            />
          </>
        )}
      </div>

      <div className="relative px-space-base pb-space-base">
        <div className="-mt-10 flex items-end justify-between gap-space-sm">
          <div className="relative shrink-0">
            <div className="rounded-full bg-app-card p-0.5 ring-4 ring-app-card">
              <AppAvatar
                type={avatarType}
                src={profile?.logo_path}
                name={name}
                alt={name}
                size="xl"
                variant="rounded"
                className="!h-20 !w-20 !rounded-full sm:!h-24 sm:!w-24"
              />
            </div>
            {!readOnly && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoLoading}
                  className="absolute bottom-0 right-0 flex min-h-touch min-w-touch items-center justify-center rounded-full bg-primary-600 text-white shadow-elevation-1 ring-2 ring-app-card transition-colors duration-fast hover:bg-primary-700 disabled:opacity-60"
                  aria-label="Subir logo"
                >
                  <AppIcon icon={Upload} size={ICON_SIZES.sm} className="text-white" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-space-md flex items-start gap-space-sm">
          <h1 className="min-w-0 flex-1 text-xl font-bold leading-tight text-app-text sm:text-2xl">
            {name}
          </h1>
          {!readOnly && onEditName && (
            <button
              type="button"
              onClick={onEditName}
              className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-primary-600 transition-colors duration-fast hover:bg-primary-50"
              aria-label="Editar nombre"
            >
              <AppIcon icon={Pencil} size={ICON_SIZES.md} />
            </button>
          )}
        </div>

        <div className="mt-space-sm">
          {readOnly ? (
            isCompanyVerified(profile) ? (
              <VerifiedBadge size="sm" />
            ) : (
              <span className="inline-flex items-center gap-space-xs rounded-radius-full bg-amber-50 px-space-sm py-space-xs text-caption font-medium text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-900">
                <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-amber-600" />
                No verificada
              </span>
            )
          ) : (
            <Link to={rolePath(role || ROLES.BUSINESS, '/verification')}>
              <CompanyVerificationStatus company={profile} profile />
            </Link>
          )}
        </div>

        {sectorCity && (
          <p className="mt-space-sm text-body-small text-app-muted">{sectorCity}</p>
        )}

        {!sectorCity && (
          <p className="mt-space-sm text-body-small text-app-muted">
            {getCompanyLocationText(profile)}
          </p>
        )}

        {showFollowerCount && followerCount > 0 && (
          <p className="mt-space-sm text-body-small font-medium tabular-nums text-app-text">
            {formatFollowerNumber(followerCount)}
          </p>
        )}

        {showActions && (
          <div className="mt-space-base">
            <CompanyProfileActionBar
              showFollow={showFollow}
              isFollowing={isFollowing}
              followLoading={followLoading}
              canFollow={canFollow}
              onToggleFollow={onToggleFollow}
              onViewJobs={onViewJobs}
              hasJobs={hasJobs}
              shareUrl={shareUrl}
              shareTitle={shareTitle}
              reportTargetId={reportTargetId}
              onContact={onContact}
              contactDisabled={contactDisabled}
            />
          </div>
        )}
      </div>
    </section>
  );
}
