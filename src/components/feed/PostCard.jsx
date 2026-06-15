import { useState } from 'react';
import UserAvatar from '../common/UserAvatar';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import AppIcon from '../common/AppIcon';
import { ChevronDown, Share2, ICON_SIZES } from '../../constants/icons';
import { DEFAULT_COMPANY_LOGO } from '../../constants/images';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import ShareMenu from './ShareMenu';
import { formatRelativeTime } from '../../utils/formatDate';

export default function PostCard({
  post,
  authorName,
  authorHeadline,
  authorAvatar,
  authorType = 'candidate',
  authorCompany = null,
}) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-start gap-3">
        {authorType === 'company' ? (
          <Avatar
            src={authorAvatar}
            name={authorName}
            size="md"
            fallback={DEFAULT_COMPANY_LOGO}
            className="!h-12 !w-12"
          />
        ) : (
          <UserAvatar src={authorAvatar} alt={authorName} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold text-gray-900">{authorName}</p>
            {authorType === 'company' && isCompanyVerified(authorCompany) && (
              <VerifiedBadge size="sm" />
            )}
          </div>
          {authorHeadline && <p className="text-sm text-gray-500">{authorHeadline}</p>}
        </div>
        <span className="text-xs text-gray-400">{formatRelativeTime(post.created_at)}</span>
      </div>

      <p className="whitespace-pre-wrap text-sm text-gray-800">{post.content}</p>

      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-3 w-full rounded-xl object-cover" />
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShareOpen(!shareOpen)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600"
        >
          <AppIcon icon={Share2} size={ICON_SIZES.default} className="text-primary-600" />
          Compartir
          <AppIcon
            icon={ChevronDown}
            size={ICON_SIZES.default}
            className={`text-primary-600 transition-transform ${shareOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {shareOpen && <ShareMenu url={`/feed/post/${post.id}`} title={post.content.slice(0, 50)} />}
      </div>
    </Card>
  );
}
