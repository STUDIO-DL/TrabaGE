import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { usernameService } from '../../services/username.service';
import { isEmployerRole } from '../../constants/roles';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import PageContainer from '../../components/layout/PageContainer';
import { stripUsernameAt } from '../../utils/username';
import NotFound from './NotFound';

/**
 * Resolves /@username → personal or company public profile (UUID routes).
 *
 * React Router 6 cannot match path "/@:username" against "/@handle" (matchPath
 * returns null). We therefore register "/:atHandle" and only treat segments that
 * start with "@" as username deep links; anything else is a real 404.
 */
export default function UsernameProfileRedirect() {
  const { atHandle, username: usernameParam } = useParams();
  const raw = atHandle ?? usernameParam ?? '';
  const isAtHandle = typeof raw === 'string' && raw.startsWith('@') && raw.length > 1;
  const username = isAtHandle ? stripUsernameAt(raw) : stripUsernameAt(usernameParam);

  const [state, setState] = useState({ loading: true, userId: null, role: null, error: false });

  useEffect(() => {
    if (!isAtHandle && !usernameParam) {
      setState({ loading: false, userId: null, role: null, error: true });
      return undefined;
    }
    if (!username) {
      setState({ loading: false, userId: null, role: null, error: true });
      return undefined;
    }

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
  }, [username, isAtHandle, usernameParam, raw]);

  // Single-segment paths that are not /@handle (e.g. /foobar) → NotFound
  if (atHandle != null && !isAtHandle) {
    return <NotFound />;
  }

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
