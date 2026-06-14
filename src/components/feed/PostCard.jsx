import { useState } from 'react';
import UserAvatar from '../common/UserAvatar';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import ShareMenu from './ShareMenu';
import { formatRelativeTime } from '../../utils/formatDate';

export default function PostCard({
  post,
  authorName,
  authorHeadline,
  authorAvatar,
  authorType = 'candidate',
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
            fallback="/images/default-company-logo.png"
            className="!h-12 !w-12"
          />
        ) : (
          <UserAvatar src={authorAvatar} alt={authorName} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{authorName}</p>
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
          className="text-sm font-medium text-primary-600"
        >
          Compartir ▾
        </button>
        {shareOpen && <ShareMenu url={`/feed/post/${post.id}`} title={post.content.slice(0, 50)} />}
      </div>
    </Card>
  );
}
