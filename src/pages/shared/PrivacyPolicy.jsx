import LegalDocumentLayout from '../../components/legal/LegalDocumentLayout';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { PRIVACY_ARTICLES, PRIVACY_INTRO } from '../../data/legal/privacySections';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function PrivacyPolicy() {
  usePageTitle('Política de Privacidad | TrabaGE');

  return (
    <LegalDocumentLayout
      pageTitle="Política de Privacidad"
      intro={PRIVACY_INTRO}
      articles={PRIVACY_ARTICLES}
      relatedLink={{ to: LEGAL_ROUTES.terms, label: 'Términos y Condiciones de Uso' }}
    />
  );
}
