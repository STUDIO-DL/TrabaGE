import { useRef } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  AlertTriangle,
  Bookmark,
  Building2,
  Calendar,
  Camera,
  Globe,
  MapPin,
  Pencil,
  ShieldCheck,
  Upload,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import CompanyVerificationStatus from './CompanyVerificationStatus';
import VerifiedBadge from '../VerifiedBadge';
import { getCompanyCoverUrl, getCompanyLogoUrl } from '../../../constants/images';
import {
  displayCompanyValue,
  getCompanyDisplayName,
  getCompanyLocationText,
  getCompanySectorText,
  hasCompanyDescription,
} from '../../../utils/companyProfile';
import { isCompanyVerified } from '../../../utils/companyVerification';

function QuickStat({ icon, label, value }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
        <AppIcon icon={icon} size={ICON_SIZES.default} className="text-primary-600" />
      </span>
      <p className="mt-1.5 text-xs font-medium text-primary-700/70">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900">{displayCompanyValue(value)}</p>
    </div>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center border-r border-primary-100 px-2 py-3 text-center last:border-r-0">
      <AppIcon icon={icon} size={ICON_SIZES.default} className="text-primary-600" />
      <p className="mt-2 text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{displayCompanyValue(value)}</p>
    </div>
  );
}

function MediaUploadButton({ label, loading, className = '', inputId }) {
  return (
    <label
      htmlFor={inputId}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-md ring-1 ring-primary-100 backdrop-blur transition hover:bg-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${className}`}
    >
      <AppIcon icon={Camera} size={ICON_SIZES.sm} className="text-primary-600" />
      {loading ? 'Subiendo…' : label}
    </label>
  );
}

export default function CompanyProfileHeader({
  profile,
  companyId,
  readOnly = false,
  onEditName,
  onBookmark,
  onUploadLogo,
  onUploadCover,
  logoLoading = false,
  coverLoading = false,
}) {
  const logoInputRef = useRef(null);
  const coverInputId = 'company-cover-input';
  const name = getCompanyDisplayName(profile);
  const logoSrc = getCompanyLogoUrl(profile?.logo_path);
  const coverSrc = getCompanyCoverUrl(profile?.cover_url);
  const hasCustomLogo = Boolean(profile?.logo_path);

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
    <section className="px-4 pb-5 pt-4">
      <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-lg shadow-primary-900/[0.06] ring-1 ring-primary-50">
        <div className="relative h-36 overflow-hidden">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-primary-400/25 blur-2xl"
                aria-hidden
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(255,255,255,0.08)_100%)]" />
            </div>
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
                className="absolute bottom-3 right-3 z-10"
              />
            </>
          )}
        </div>

        <div className="relative px-4 pb-5">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <div className="relative shrink-0">
              <div className="overflow-hidden rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white">
                <img
                  src={logoSrc}
                  alt={name}
                  className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
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
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-md ring-2 ring-white transition hover:bg-primary-700 disabled:opacity-60"
                    aria-label="Subir logo"
                  >
                    <AppIcon icon={Upload} size={ICON_SIZES.sm} className="text-white" />
                  </button>
                </>
              )}
            </div>

            {!readOnly && (
              <p className="mt-2 text-[11px] text-gray-500">Max 2 MB</p>
            )}

            {!readOnly && !hasCustomLogo && (
              <span className="mb-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700">
                Logo predeterminado
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary-200 bg-primary-50/40 px-4 py-3">
            <p className="truncate text-base font-semibold text-gray-900">{name}</p>
            {!readOnly && (
              <button
                type="button"
                onClick={onEditName}
                className="shrink-0 rounded-lg p-1.5 text-primary-600 hover:bg-primary-100"
                aria-label="Editar nombre"
              >
                <AppIcon icon={Pencil} size={ICON_SIZES.default} />
              </button>
            )}
          </div>

          <div className="mt-3">
            {readOnly ? (
              isCompanyVerified(profile) ? (
                <VerifiedBadge size="md" />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-amber-600" />
                  No verificada
                </span>
              )
            ) : (
              <Link to="/company/verification">
                <CompanyVerificationStatus company={profile} profile />
              </Link>
            )}
          </div>

          <p className="mt-3 text-sm font-medium text-primary-800/80">{getCompanySectorText(profile)}</p>

          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
            <AppIcon icon={MapPin} size={ICON_SIZES.default} className="shrink-0 text-primary-600" />
            <span>{getCompanyLocationText(profile)}</span>
          </div>

          <div className="mt-4 flex items-center rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50/80 via-white to-primary-50/50 px-1 py-3">
            <QuickStat icon={Users} label="Tamaño" value={profile?.company_size} />
            <div className="h-12 w-px shrink-0 bg-primary-100" aria-hidden />
            <QuickStat icon={Calendar} label="Fundada en" value={profile?.founded_year} />
            <div className="h-12 w-px shrink-0 bg-primary-100" aria-hidden />
            <QuickStat icon={Globe} label="Sitio web" value={profile?.website} />
            <button
              type="button"
              onClick={onBookmark}
              className="ml-1 shrink-0 rounded-xl p-2 text-primary-600 hover:bg-primary-100"
              aria-label="Guardar empresa"
            >
              <AppIcon icon={Bookmark} size={ICON_SIZES.default} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompanyAboutSection({ profile, readOnly = false, onEditAbout, expanded, onToggleExpand }) {
  const description = profile?.description?.trim();
  const hasDescription = hasCompanyDescription(profile);
  const emptyText = 'No hay información disponible sobre esta empresa.';
  const previewText = hasDescription && !expanded ? `${description.slice(0, 120)}...` : description;

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <span className="h-5 w-1 rounded-full bg-primary-600" aria-hidden />
        Sobre nosotros
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {hasDescription ? previewText : emptyText}
      </p>
      {hasDescription && description.length > 120 && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {expanded ? 'Mostrar menos' : 'Mostrar más'}
        </button>
      )}
      {!readOnly && !hasDescription && (
        <button
          type="button"
          onClick={onEditAbout}
          className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Mostrar más
        </button>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-primary-100 bg-gradient-to-b from-primary-50/60 to-white">
        <div className="flex">
          <InfoTile icon={Building2} label="Tipo de empresa" value={profile?.company_type} />
          <InfoTile icon={ShieldCheck} label="Sector" value={profile?.sector} />
          <InfoTile icon={Users} label="Tamaño" value={profile?.company_size} />
          <InfoTile icon={Calendar} label="Fundación" value={profile?.founded_year} />
        </div>
      </div>
    </section>
  );
}
