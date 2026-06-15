import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { hasCompanyDescription } from '../../../utils/companyProfile';
import { premiumCardClass } from './companyProfileStyles';
import SectionTitle from './SectionTitle';

export default function CompanyAboutCard({ profile, readOnly = false, onEdit }) {
  const description = profile?.description?.trim();

  return (
    <Card padding="lg" shadow={false} className={premiumCardClass}>
      <SectionTitle>Sobre nosotros</SectionTitle>
      {hasCompanyDescription(profile) ? (
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          {readOnly
            ? 'Esta empresa aún no ha añadido una descripción.'
            : 'Comparte la historia, misión y valores de tu empresa para que los candidatos te conozcan mejor.'}
        </p>
      )}
      {!readOnly && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4 border-primary-200 text-primary-700 hover:bg-primary-50"
          onClick={onEdit}
        >
          Editar descripción
        </Button>
      )}
    </Card>
  );
}
