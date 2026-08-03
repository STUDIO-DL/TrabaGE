import { useEffect, useState } from 'react';
import UserProfileLink from '../../../components/common/UserProfileLink';
import ExpandableText from '../../../components/common/ExpandableText';
import TimeAgo from '../../../components/common/TimeAgo';
import VerifiedBadge from '../../../components/company/VerifiedBadge';
import PostImage from '../../../components/feed/PostImage';
import { postEngagementService } from '../data/postEngagement.service';
import { resolvePostImageUrl } from '../../../utils/storagePaths';
import { isCompanyVerified } from '../../../utils/companyVerification';
import { isEmployerAuthor } from '../../../constants/authorTypes';

/**
 * Nested preview of the original publication inside a repost.
 */
export default function OriginalPostEmbed({ originalPostId, originalPost: provided }) {
  const [original, setOriginal] = useState(provided ?? null);

  useEffect(() => {
    if (provided || !originalPostId) return undefined;
    let cancelled = false;
    postEngagementService.getOriginalPost(originalPostId).then(async ({ data }) => {
      if (cancelled || !data) return;
      const [enriched] = await postEngagementService.enrichPostsForFeed([data]);
      if (!cancelled) setOriginal(enriched);
    });
    return () => {
      cancelled = true;
    };
  }, [originalPostId, provided]);

  if (!original && !originalPostId) return null;

  if (!original) {
    return (
      <div className="mt-space-sm rounded-radius-md border border-app-border px-space-md py-space-sm text-caption text-app-muted">
        Cargando publicación original…
      </div>
    );
  }

  const imageSrc = resolvePostImageUrl(original.post_image_path);
  const hasText = Boolean(original.content?.trim());

  return (
    <div className="mt-space-sm overflow-hidden rounded-radius-md border border-app-border bg-app-surface/40 p-space-md">
      <div className="mb-space-sm flex items-start gap-space-sm">
        <UserProfileLink
          userId={original.author_id}
          userType={original.author_type}
          name={original.author_name}
          avatar={original.author_avatar}
          size="sm"
          layout="avatar"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-space-xs">
            <UserProfileLink
              userId={original.author_id}
              userType={original.author_type}
              name={original.author_name}
              layout="name"
            />
            {isEmployerAuthor(original.author_type) &&
              isCompanyVerified(original.author_company) && <VerifiedBadge size="sm" />}
          </div>
          <TimeAgo date={original.created_at} className="text-caption text-app-subtle" />
        </div>
      </div>
      {hasText ? <ExpandableText text={original.content} /> : null}
      <PostImage src={imageSrc} />
    </div>
  );
}
