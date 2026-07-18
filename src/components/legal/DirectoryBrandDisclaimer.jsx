import { DIRECTORY_BRAND_DISCLAIMER } from '../../data/legal/intellectualPropertySections';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { LegalInlineLink } from './LegalLinks';

/** Nota atenuada al pie del buscador / directorio */
export default function DirectoryBrandDisclaimer({ className = '' }) {
  return (
    <p
      className={[
        'px-space-base py-space-base text-center text-caption leading-relaxed text-app-subtle',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="note"
    >
      {DIRECTORY_BRAND_DISCLAIMER}{' '}
      <LegalInlineLink to={LEGAL_ROUTES.termsThirdPartyMarks}>Más información</LegalInlineLink>.
    </p>
  );
}
