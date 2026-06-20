import { useCallback, useEffect, useState } from 'react';
import UserProfileLink from '../../common/UserProfileLink';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { followsService } from '../../../services/follows.service';
import { resolveUserAvatar } from '../../../utils/resolveUserAvatar';

const PAGE_SIZE = 20;

export default function CompanyFollowersSection({ targetType, targetId, visible = false }) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const loadFollowers = useCallback(
    async (offset = 0, append = false) => {
      if (!visible || !targetId) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      const { data, error: fetchError } = await followsService.getFollowers(targetType, targetId, {
        limit: PAGE_SIZE,
        offset,
      });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const rows = data ?? [];
      setFollowers((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
      setLoadingMore(false);
    },
    [targetId, targetType, visible],
  );

  useEffect(() => {
    if (!visible) return;
    loadFollowers(0, false);
  }, [visible, loadFollowers]);

  if (!visible) return null;

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <span className="h-5 w-1 rounded-full bg-primary-600" aria-hidden />
        Seguidores
      </h3>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : followers.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Aún no tienes seguidores.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {followers.map((follower) => (
            <li key={follower.user_id}>
              <UserProfileLink
                userId={follower.user_id}
                name={follower.full_name}
                avatar={resolveUserAvatar(follower.avatar_path)}
                headline={follower.headline?.trim() || 'Candidato'}
                layout="row"
                className="py-3"
                nameClassName="truncate font-medium text-gray-900 hover:text-primary-700 transition-colors"
              />
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          className="mt-3"
          loading={loadingMore}
          onClick={() => loadFollowers(followers.length, true)}
        >
          Cargar más
        </Button>
      )}
    </section>
  );
}
