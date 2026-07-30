import { useSearchParams } from 'react-router-dom';

export const FEED_TABS = {
  FOR_YOU: 'for-you',
  DISCOVER: 'discover',
};

const TAB_ITEMS = [
  { id: FEED_TABS.FOR_YOU, label: 'Para ti' },
  { id: FEED_TABS.DISCOVER, label: 'Descubrir' },
];

export function useFeedTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === FEED_TABS.DISCOVER ? FEED_TABS.DISCOVER : FEED_TABS.FOR_YOU;

  const setActiveTab = (tab) => {
    if (tab === FEED_TABS.FOR_YOU) {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return { activeTab, setActiveTab };
}

export default function FeedTabs({ activeTab, onTabChange }) {
  return (
    <nav
      className="flex border-b border-app-border px-space-base"
      role="tablist"
      aria-label="Secciones del inicio"
    >
      {TAB_ITEMS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={[
              'motion-tab-indicator min-h-touch flex-1 border-b-2 pb-space-sm pt-space-md text-body-small font-semibold',
              isActive
                ? 'border-primary-600 bg-primary-50/60 text-primary-700'
                : 'border-transparent font-medium text-app-muted hover:bg-primary-50/30 hover:text-app-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
