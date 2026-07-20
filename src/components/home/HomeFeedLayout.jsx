import PageContainer from '../layout/PageContainer';
import FeedTabs, { FEED_TABS, useFeedTab } from './FeedTabs';
import ParaTiPanel from './ParaTiPanel';
import DiscoverHub from '../discover/DiscoverHub';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

const EMPTY_COPY = {
  [ROLES.PERSONAL]:
    'Completa tu perfil para ver publicaciones de tu sector, habilidades e intereses profesionales.',
  [ROLES.BUSINESS]:
    'Aquí verás tendencias y publicaciones relevantes para tu sector y actividad empresarial.',
  [ROLES.ORGANIZATION]:
    'Aquí verás contenido educativo y del sector acorde a tu organización.',
};

export default function HomeFeedLayout({ header }) {
  const { role } = useAuth();
  const { activeTab, setActiveTab } = useFeedTab();

  return (
    <PageContainer topBar={header}>
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === FEED_TABS.FOR_YOU ? (
        <ParaTiPanel emptyDescription={EMPTY_COPY[role] ?? EMPTY_COPY[ROLES.PERSONAL]} />
      ) : (
        <DiscoverHub />
      )}
    </PageContainer>
  );
}
