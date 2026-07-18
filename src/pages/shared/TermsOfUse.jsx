import LegalDocumentLayout from '../../components/legal/LegalDocumentLayout';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { TERMS_ARTICLES, TERMS_INTRO } from '../../data/legal/termsSections';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function TermsOfUse() {
  usePageTitle('Términos de Uso | TrabaGE');

  return (
    <LegalDocumentLayout
      pageTitle="Términos y Condiciones de Uso"
      intro={TERMS_INTRO}
      articles={TERMS_ARTICLES}
      relatedLink={{ to: LEGAL_ROUTES.privacy, label: 'Política de Privacidad' }}
    />
  );
}
