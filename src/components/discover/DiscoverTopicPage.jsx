import PostCard from '../feed/PostCard';
import { DISCOVER_SECTION_ICONS } from '../../constants/discoverEmptyStates';
import { getDiscoverSectionById } from '../../constants/discoverSections';
import { useDiscoverPosts } from '../../hooks/useDiscoverPosts';
import DiscoverSectionPage from './DiscoverSectionPage';

export default function DiscoverTopicPage({ sectionId }) {
  const section = getDiscoverSectionById(sectionId);
  const { posts, loading, error, reload } = useDiscoverPosts(sectionId);
  const emptyIcon = DISCOVER_SECTION_ICONS[sectionId];

  return (
    <DiscoverSectionPage
      title={section?.title ?? 'Descubrir'}
      loading={loading}
      error={error}
      onRetry={reload}
      isEmpty={!loading && !error && posts.length === 0}
      emptyIcon={emptyIcon}
    >
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          authorId={post.author_id}
          authorName={post.author_name?.trim() || ''}
          authorHeadline={post.author_headline ?? ''}
          authorAvatar={post.author_avatar}
          authorType={post.author_type ?? 'personal'}
          authorCompany={post.author_company}
        />
      ))}
    </DiscoverSectionPage>
  );
}
