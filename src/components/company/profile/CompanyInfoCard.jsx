import Card from '../../ui/Card';
import { COMPANY_INFO_ROWS, displayCompanyValue } from '../../../utils/companyProfile';
import { premiumCardClass } from './companyProfileStyles';
import SectionTitle from './SectionTitle';

export default function CompanyInfoCard({ profile, readOnly = false, onEdit }) {
  return (
    <Card padding="lg" shadow={false} className={premiumCardClass}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <SectionTitle>Información de la empresa</SectionTitle>
        {!readOnly && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Editar
          </button>
        )}
      </div>

      <dl className="divide-y divide-primary-50">
        {COMPANY_INFO_ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="text-right text-sm font-medium text-gray-900">
              {displayCompanyValue(profile?.[key])}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
