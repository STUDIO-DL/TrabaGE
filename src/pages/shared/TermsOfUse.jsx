import LegalDocumentLayout from '../../components/legal/LegalDocumentLayout';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { TERMS_ARTICLES, TERMS_INTRO } from '../../data/legal/termsSections';
import { IP_NOTICE_ARTICLES } from '../../data/legal/intellectualPropertySections';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function TermsOfUse() {
  usePageTitle('Términos de Uso | TrabaGE');

  return (
    <LegalDocumentLayout
      pageTitle="Términos y Condiciones de Uso"
      intro={TERMS_INTRO}
      articles={TERMS_ARTICLES}
      finalPartTitle="Propiedad intelectual de terceros y uso nominativo"
      finalArticles={IP_NOTICE_ARTICLES}
      relatedLink={{ to: LEGAL_ROUTES.legalNotice, label: 'Aviso Legal / Propiedad Intelectual' }}
    />
  );
}
