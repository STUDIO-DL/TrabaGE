import PageContainer from '../layout/PageContainer';
import FeedTabs, { FEED_TABS, useFeedTab } from './FeedTabs';
import ParaTiPanel from './ParaTiPanel';
import DiscoverHub from '../discover/DiscoverHub';
import FeedDesktopAside from './FeedDesktopAside';

export default function HomeFeedLayout({ header }) {
  const { activeTab, setActiveTab } = useFeedTab();

  return (
    <PageContainer
      topBar={header}
      width="feed"
      aside={<FeedDesktopAside />}
      contentClassName="motion-page"
    >
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === FEED_TABS.FOR_YOU ? <ParaTiPanel /> : <DiscoverHub />}
    </PageContainer>
  );
}
