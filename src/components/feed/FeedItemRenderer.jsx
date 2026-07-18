import PostCard from './PostCard';
import FeedNewsCard from './FeedNewsCard';
import FeedEventCard from './FeedEventCard';
import FeedCourseCard from './FeedCourseCard';
import FeedRecommendationCard from './FeedRecommendationCard';
import { FEED_CONTENT_TYPES } from '../../constants/feedContentTypes';

// The Home feed is social/informational only. Job offers are intentionally not
// rendered here — the entire vacancy experience lives in the Empleos section.
export default function FeedItemRenderer({
  item,
  canManage = false,
  onEdit,
  onDelete,
}) {
  const post = item.payload;

  switch (item.content_type) {
    case FEED_CONTENT_TYPES.NEWS:
      return <FeedNewsCard article={post} />;

    case FEED_CONTENT_TYPES.EVENT:
      return <FeedEventCard event={post} />;

    case FEED_CONTENT_TYPES.COURSE:
      return <FeedCourseCard course={post} />;

    case FEED_CONTENT_TYPES.RECOMMENDATION_CARD:
      return <FeedRecommendationCard item={item} />;

    case FEED_CONTENT_TYPES.ADVICE:
    case FEED_CONTENT_TYPES.POST:
    default:
      return (
        <PostCard
          post={post}
          authorId={post.author_id}
          authorName={post.author_name?.trim() || ''}
          authorHeadline={post.author_headline ?? ''}
          authorAvatar={post.author_avatar}
          authorType={post.author_type ?? 'personal'}
          authorCompany={post.author_company}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
  }
}
