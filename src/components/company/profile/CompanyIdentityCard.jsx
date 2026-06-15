import { Link } from 'react-router-dom';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { getCompanyLogoUrl } from '../../../constants/images';
import { getCompanyDisplayName } from '../../../utils/companyProfile';
import {
  Building2,
  Calendar,
  Globe,
  MapPin,
  Pencil,
  Upload,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import CompanyVerificationStatus from './CompanyVerificationStatus';
import { premiumCardClass } from './companyProfileStyles';
import SectionTitle from './SectionTitle';
import { displayCompanyValue } from '../../../utils/companyProfile';

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-primary-50 py-3 last:border-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
        <AppIcon icon={icon} size={ICON_SIZES.default} className="text-primary-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600/70">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-900">{displayCompanyValue(value)}</p>
      </div>
    </div>
  );
}

export default function CompanyIdentityCard({ profile, onUploadLogo, onEditName }) {
  const logoSrc = getCompanyLogoUrl(profile?.logo_url);
  const hasCustomLogo = Boolean(profile?.logo_url);
  const name = getCompanyDisplayName(profile);

  return (
    <Card padding="lg" shadow={false} className={premiumCardClass}>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center sm:w-40">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 to-white p-1 ring-2 ring-primary-100">
            <img
              src={logoSrc}
              alt={name}
              className="h-32 w-32 rounded-xl object-cover"
            />
          </div>
          {!hasCustomLogo && (
            <p className="mt-2 text-center text-xs text-primary-600/70">Logo predeterminado</p>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 inline-flex items-center gap-1.5 border-primary-200 text-primary-700 hover:bg-primary-50"
            onClick={onUploadLogo}
          >
            <AppIcon icon={Upload} size={ICON_SIZES.sm} />
            Subir imagen
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-bold text-gray-900">{name}</h2>
            <button
              type="button"
              onClick={onEditName}
              className="shrink-0 rounded-lg p-1 text-primary-500 hover:bg-primary-50"
              aria-label="Editar nombre"
            >
              <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
            </button>
          </div>

          <div className="mt-2">
            <Link to="/company/verification">
              <CompanyVerificationStatus company={profile} profile />
            </Link>
          </div>

          <div className="mt-4">
            <DetailRow icon={Building2} label="Sector" value={profile?.sector} />
            <DetailRow icon={MapPin} label="Ubicación" value={profile?.city} />
            <DetailRow icon={Users} label="Tamaño" value={profile?.company_size} />
            <DetailRow icon={Calendar} label="Fundada en" value={profile?.founded_year} />
            <DetailRow icon={Globe} label="Sitio web" value={profile?.website} />
          </div>
        </div>
      </div>
    </Card>
  );
}
