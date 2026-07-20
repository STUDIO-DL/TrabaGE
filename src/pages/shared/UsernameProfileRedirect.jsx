import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { usernameService } from '../../services/username.service';
import { isEmployerRole } from '../../constants/roles';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import PageContainer from '../../components/layout/PageContainer';

/**
 * Resolves /@username → personal or company public profile (UUID routes).
 */
export default function UsernameProfileRedirect() {
  const { username } = useParams();
  const [state, setState] = useState({ loading: true, userId: null, role: null, error: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ loading: true, userId: null, role: null, error: false });
      const { data, error } = await usernameService.resolveUsername(username);
      if (cancelled) return;

      if (error || !data?.user_id) {
        setState({ loading: false, userId: null, role: null, error: true });
        return;
      }

      setState({
        loading: false,
        userId: data.user_id,
        role: data.role,
        error: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (state.loading) {
    return (
      <PageContainer topBar={false} bottomNav>
        <ProfilePageSkeleton />
      </PageContainer>
    );
  }

  if (state.error || !state.userId) {
    return <Navigate to="/search" replace />;
  }

  if (isEmployerRole(state.role)) {
    return <Navigate to={`/companies/${state.userId}`} replace />;
  }

  return <Navigate to={`/profile/${state.userId}`} replace />;
}
