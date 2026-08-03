import { useEffect, useRef, useState } from 'react';
import UserProfileLink from '../../../components/common/UserProfileLink';
import ExpandableText from '../../../components/common/ExpandableText';
import TimeAgo from '../../../components/common/TimeAgo';
import VerifiedBadge from '../../../components/company/VerifiedBadge';
import PostImage from '../../../components/feed/PostImage';
import { postEngagementService } from '../data/postEngagement.service';
import { resolvePostImageUrl } from '../../../utils/storagePaths';
import { isCompanyVerified } from '../../../utils/companyVerification';
import { isEmployerAuthor } from '../../../constants/authorTypes';
import { useAuth } from '../../../hooks/useAuth';
import { getSelfAwareName, isSameUser } from '../../../utils/copyLabels';
import { companyAnalyticsService } from '../../company-analytics/companyAnalytics.service';
import { professionalPanelService } from '../../professional-panel/data/professionalPanel.service';

/**
 * Nested preview of the original publication inside a repost.
 */
export default function OriginalPostEmbed({
  originalPostId,
  originalPost: provided,
  trackViaRepost = false,
}) {
  const { user } = useAuth();
  const [original, setOriginal] = useState(provided ?? null);
  const trackedRef = useRef(false);

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

  useEffect(() => {
    if (!trackViaRepost || !original?.id || !original.author_id || trackedRef.current) return;
    if (isSameUser(user?.id, original.author_id)) return;
    trackedRef.current = true;

    if (isEmployerAuthor(original.author_type)) {
      void companyAnalyticsService.trackPostView(original.author_id, original.id, {
        via_repost: true,
        source: 'feed_repost',
      });
      return;
    }

    void professionalPanelService.trackPostView(original.author_id, original.id, {
      via_repost: true,
      source: 'feed_repost',
    });
  }, [original, trackViaRepost, user?.id]);

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
  const isOwnOriginal = isSameUser(user?.id, original.author_id);
  const displayAuthorName = getSelfAwareName(original.author_name, { isSelf: isOwnOriginal });

  return (
    <div className="mt-space-sm overflow-hidden rounded-radius-md border border-app-border bg-app-surface/40 p-space-md">
      <div className="mb-space-sm flex items-start gap-space-sm">
        <UserProfileLink
          userId={original.author_id}
          userType={original.author_type}
          name={displayAuthorName}
          avatar={original.author_avatar}
          size="sm"
          layout="avatar"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-space-xs">
            <UserProfileLink
              userId={original.author_id}
              userType={original.author_type}
              name={displayAuthorName}
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
