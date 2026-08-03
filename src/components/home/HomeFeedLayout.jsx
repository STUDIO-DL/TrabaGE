import PageContainer from '../layout/PageContainer';
import FeedTabs, { FEED_TABS, useFeedTab } from './FeedTabs';
import ParaTiPanel from './ParaTiPanel';
import DiscoverHub from '../discover/DiscoverHub';
import FeedDesktopAside from './FeedDesktopAside';

/**
 * Home feed. Pass optional `authorId` to reuse the same surface filtered to one author
 * (profile → Publicaciones). Tabs/Discover are hidden in author mode.
 */
export default function HomeFeedLayout({ header, authorId = null, emptyDescription, bottomNav }) {
  const { activeTab, setActiveTab } = useFeedTab();
  const isAuthorFeed = Boolean(authorId);

  return (
    <PageContainer
      topBar={header}
      width="feed"
      aside={<FeedDesktopAside />}
      contentClassName="motion-page"
      bottomNav={bottomNav}
    >
      {isAuthorFeed ? (
        <ParaTiPanel authorId={authorId} emptyDescription={emptyDescription} />
      ) : (
        <>
          <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === FEED_TABS.FOR_YOU ? <ParaTiPanel /> : <DiscoverHub />}
        </>
      )}
    </PageContainer>
  );
}
