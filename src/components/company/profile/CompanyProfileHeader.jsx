import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Camera,
  MapPin,
  Pencil,
  Settings,
  Upload,
  Users,
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
import {
  profileBannerGradientClass,
  profileBannerMetaItemClass,
  profileCoverOverlayClass,
} from './companyProfileStyles';

function BannerSkyline() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 right-0 h-[70%] w-[55%] text-white/[0.12] sm:w-[45%]"
      viewBox="0 0 480 220"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M120 220V130h36v90h28V95h32v125h24V70h28v150h40V110h30v110h44V55h26v165h38V88h34v132h52V220H120zm180 0V145h22v75h26V118h24v102h28V92h20v128h32V156h18v64h30V220H300z"
      />
    </svg>
  );
}

function MediaUploadButton({ label, loading, inputId, className = '', onBanner = false }) {
  const bannerClass = onBanner
    ? 'bg-white/15 text-white ring-1 ring-inset ring-white/40 backdrop-blur hover:bg-white/25'
    : 'bg-app-card/95 text-primary-700 ring-app-border hover:bg-app-card';

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex min-h-touch cursor-pointer items-center gap-space-xs rounded-radius-full px-space-md py-space-xs text-caption font-semibold shadow-elevation-1 backdrop-blur transition-colors duration-fast has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${bannerClass} ${className}`}
    >
      <AppIcon
        icon={Camera}
        size={ICON_SIZES.sm}
        className={onBanner ? 'text-white' : 'text-primary-600'}
      />
      {loading ? 'Subiendo…' : label}
    </label>
  );
}

function formatEmployeeCount(size) {
  const trimmed = size?.trim();
  if (!trimmed) return null;
  if (/empleado/i.test(trimmed)) return trimmed;
  return `${trimmed} empleados`;
}

function buildHeaderMeta(profile) {
  const sector = getCompanySectorText(profile);
  const city = profile?.city?.trim();
  const country = profile?.country?.trim();
  const location = [city, country].filter(Boolean).join(', ');
  const employees = formatEmployeeCount(profile?.company_size);

  return [
    sector !== 'Sector no especificado'
      ? { key: 'sector', icon: Briefcase, text: sector }
      : null,
    location ? { key: 'location', icon: MapPin, text: location } : null,
    employees ? { key: 'size', icon: Users, text: employees } : null,
  ].filter(Boolean);
}

export default function CompanyProfileHeader({
  profile,
  readOnly = false,
  showBackButton = false,
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
  onSettings,
}) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const logoInputRef = useRef(null);
  const coverInputId = 'company-cover-input';

  const name = getCompanyDisplayName(profile);
  const avatarType = avatarTypeFromCompanyProfile(profile);
  const coverSrc = getCompanyCoverUrl(profile?.cover_url);
  const metaItems = buildHeaderMeta(profile);
  const verified = isCompanyVerified(profile);

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
    <section className="overflow-visible bg-app-card">
      <div className="relative overflow-visible">
        <div className="relative min-h-[15.5rem] overflow-visible sm:min-h-[16.5rem]">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className={profileBannerGradientClass} aria-hidden />
          )}

          <div className={profileCoverOverlayClass} aria-hidden />
          <BannerSkyline />

          {showBackButton && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute left-space-sm top-space-sm z-20 inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm p-space-sm text-white transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Volver"
            >
              <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
            </button>
          )}

          {onSettings && (
            <button
              type="button"
              onClick={onSettings}
              className="absolute right-space-sm top-space-sm z-20 inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm p-space-sm text-white transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Configuración"
            >
              <AppIcon icon={Settings} size={ICON_SIZES.md} />
            </button>
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
                onBanner
                className="absolute bottom-space-sm right-space-base z-20"
              />
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 px-space-base pb-space-md">
            <div className="-mb-14 flex items-start gap-space-md sm:-mb-16">
              <div className="relative shrink-0">
                <div className="rounded-radius-md bg-white p-1 ring-4 ring-white shadow-elevation-2">
                  <AppAvatar
                    type={avatarType}
                    src={profile?.logo_path}
                    name={name}
                    alt={name}
                    size="2xl"
                    variant="rounded"
                    className="!rounded-radius-md border-0 bg-white"
                  />
                </div>

                {verified && (
                  <span
                    className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white"
                    aria-hidden
                  />
                )}

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
                      className="absolute bottom-1 right-1 flex min-h-touch min-w-touch items-center justify-center rounded-full bg-primary-600 text-white shadow-elevation-1 ring-2 ring-white transition-colors duration-fast hover:bg-primary-700 disabled:opacity-60"
                      aria-label="Subir logo"
                    >
                      <AppIcon icon={Upload} size={ICON_SIZES.sm} className="text-white" />
                    </button>
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1 text-white">
                <div className="flex items-start gap-space-sm">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-space-sm gap-y-space-xs">
                    <h1 className="text-title font-semibold uppercase leading-tight tracking-wide text-white">
                      {name}
                    </h1>
                    {verified && <VerifiedBadge size="sm" />}
                    {readOnly && !verified && (
                      <span className="inline-flex items-center gap-space-xs rounded-radius-full bg-amber-400/20 px-space-sm py-space-xs text-caption font-medium text-amber-100 ring-1 ring-amber-200/40">
                        <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-amber-200" />
                        No verificada
                      </span>
                    )}
                  </div>

                  {!readOnly && onEditName && (
                    <button
                      type="button"
                      onClick={onEditName}
                      className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-white/90 transition-colors duration-fast hover:bg-white/10"
                      aria-label="Editar nombre"
                    >
                      <AppIcon icon={Pencil} size={ICON_SIZES.md} />
                    </button>
                  )}
                </div>

                {!readOnly && (
                  <div className="mt-space-xs">
                    <Link to={rolePath(role || ROLES.BUSINESS, '/verification')}>
                      <CompanyVerificationStatus company={profile} profile />
                    </Link>
                  </div>
                )}

                {metaItems.length > 0 ? (
                  <div className="mt-space-sm flex flex-wrap items-center gap-x-space-md gap-y-space-xs">
                    {metaItems.map((item) => (
                      <span key={item.key} className={profileBannerMetaItemClass}>
                        <AppIcon icon={item.icon} size={ICON_SIZES.sm} className="shrink-0 text-white/80" />
                        <span>{item.text}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-space-sm text-caption text-white/80">
                    {getCompanyLocationText(profile)}
                  </p>
                )}

                {showFollowerCount && followerCount > 0 && (
                  <p className="mt-space-sm text-caption font-medium tabular-nums text-white/90">
                    {formatFollowerNumber(followerCount)} seguidores
                  </p>
                )}

                {showActions && (
                  <div className="mt-space-md">
                    <CompanyProfileActionBar
                      variant="banner"
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
            </div>
          </div>
        </div>

        <div className="h-14 bg-app-card sm:h-16" aria-hidden />
      </div>
    </section>
  );
}
