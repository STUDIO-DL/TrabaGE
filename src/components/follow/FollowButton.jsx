import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

export default function FollowButton({
  isFollowing = false,
  loading = false,
  disabled = false,
  canFollow = true,
  onToggle,
  appearance = 'default',
  className = '',
}) {
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!canFollow) {
      navigate('/login');
      return;
    }

    await onToggle?.();
  };

  if (appearance === 'banner' && isFollowing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
      >
        {loading && (
          <span
            className="mr-space-xs inline-block h-icon-sm w-icon-sm animate-spin rounded-radius-circular border-2 border-current border-t-transparent"
            aria-hidden
          />
        )}
        Siguiendo ✓
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? 'secondary' : 'primary'}
      onClick={handleClick}
      loading={loading}
      disabled={disabled}
      className={className}
    >
      {isFollowing ? 'Siguiendo ✓' : 'Seguir'}
    </Button>
  );
}
