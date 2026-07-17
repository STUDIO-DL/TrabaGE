import LegalDocumentLayout from '../../components/legal/LegalDocumentLayout';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import {
  IP_NOTICE_ARTICLES,
  IP_NOTICE_INTRO,
} from '../../data/legal/intellectualPropertySections';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function LegalNotice() {
  usePageTitle('Aviso Legal / Propiedad Intelectual | TrabaGE');

  return (
    <LegalDocumentLayout
      pageTitle="Aviso Legal / Propiedad Intelectual"
      intro={IP_NOTICE_INTRO}
      articles={IP_NOTICE_ARTICLES}
      relatedLink={{ to: LEGAL_ROUTES.terms, label: 'Términos y Condiciones de Uso' }}
    />
  );
}
