import PostCard from '../feed/PostCard';
import { DISCOVER_SECTION_ICONS } from '../../constants/discoverEmptyStates';
import { getDiscoverSectionById } from '../../constants/discoverSections';
import { useDiscoverPosts } from '../../hooks/useDiscoverPosts';
import { useAuth } from '../../hooks/useAuth';
import { usePostMutations } from '../../hooks/usePostMutations';
import DiscoverSectionPage from './DiscoverSectionPage';

export default function DiscoverTopicPage({ sectionId }) {
  const section = getDiscoverSectionById(sectionId);
  const { user } = useAuth();
  const { posts, loading, error, reload, removePost } = useDiscoverPosts(sectionId);
  const emptyIcon = DISCOVER_SECTION_ICONS[sectionId];
  const { handleEdit, handleDelete, deleteConfirmModal } = usePostMutations({
    onSuccess: (deletedPost) => {
      if (deletedPost?.id) {
        removePost(deletedPost.id);
        return;
      }
      reload();
    },
  });

  return (
    <>
      <DiscoverSectionPage
        title={section?.title ?? 'Descubrir'}
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={!loading && !error && posts.length === 0}
        emptyIcon={emptyIcon}
        sectionKey={sectionId}
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
            canManage={post.author_id === user?.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </DiscoverSectionPage>
      {deleteConfirmModal}
    </>
  );
}
