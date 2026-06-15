import Card from '../../ui/Card';
import AppIcon from '../../common/AppIcon';
import {
  Building2,
  Calendar,
  Globe,
  MapPin,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import { COMPANY_DETAIL_ROWS, displayCompanyValue } from '../../../utils/companyProfile';
import { premiumCardClass } from './companyProfileStyles';
import SectionTitle from './SectionTitle';

const DETAIL_ICONS = {
  sector: Building2,
  city: MapPin,
  company_size: Users,
  founded_year: Calendar,
  website: Globe,
};

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

export default function CompanyDetailsCard({ profile }) {
  return (
    <Card padding="lg" shadow={false} className={premiumCardClass}>
      <SectionTitle>Datos de la empresa</SectionTitle>
      <div className="mt-2">
        {COMPANY_DETAIL_ROWS.map(({ key, label }) => (
          <DetailRow
            key={key}
            icon={DETAIL_ICONS[key]}
            label={label}
            value={profile?.[key]}
          />
        ))}
      </div>
    </Card>
  );
}
