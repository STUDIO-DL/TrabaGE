import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

export default function FollowButton({
  isFollowing = false,
  loading = false,
  disabled = false,
  canFollow = true,
  onToggle,
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
