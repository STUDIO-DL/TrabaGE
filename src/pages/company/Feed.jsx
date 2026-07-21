import CompanyFeedHeader from '../../components/feed/CompanyFeedHeader';
import HomeFeedLayout from '../../components/home/HomeFeedLayout';

export default function Feed() {
  return <HomeFeedLayout header={<CompanyFeedHeader />} />;
}
