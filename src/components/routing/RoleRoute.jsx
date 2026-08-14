import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME, ROLE_SETUP, normalizeRole, isPersonalRole } from '../../constants/roles';
import { ONBOARDING_ROUTE, shouldShowCandidateOnboarding } from '../../constants/onboarding';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';
import AuthLoadingScreen from '../auth/AuthLoadingScreen';
import { profileService } from '../../services/profile.service';
import { getOwnCandidateProfileKey } from '../../constants/profileQueryKeys';

const ROLE_RESOLVE_TIMEOUT_MS = 20000;

/**
 * @param {object} props
 * @param {string} [props.role] - single required role
 * @param {string[]} [props.roles] - any of these roles allowed (e.g. business + organization)
 */
export default function RoleRoute({ role: requiredRole, roles: requiredRoles }) {
  const { user, role, isPreviewMode, loading, isAuthenticated, refreshAuthState, setupComplete } =
    useAuth();
  const location = useLocation();
  const allowedRoles = requiredRoles ?? (requiredRole ? [requiredRole] : []);
  const previewActive = allowedRoles.includes('admin') ? false : isPreviewActive(isPreviewMode);
  const rawRole = role ?? (previewActive ? getPreviewRole() : null);
  const effectiveRole = normalizeRole(rawRole) ?? rawRole;
  const shouldLoadCandidateProfile =
    !previewActive && isAuthenticated && isPersonalRole(effectiveRole);
  const candidateProfileKey =
    getOwnCandidateProfileKey(user?.id) ?? ['profile', 'own', 'candidate', 'disabled'];
  const candidateProfileQuery = useQuery({
    queryKey: candidateProfileKey,
    enabled: shouldLoadCandidateProfile && Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await profileService.getCandidateProfile(user.id);
      if (error) throw error;
      return data ?? null;
    },
  });
  const candidateProfile = candidateProfileQuery.data ?? null;
  const candidateProfileLoading =
    candidateProfileQuery.isLoading && shouldLoadCandidateProfile;
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);

  useEffect(() => {
    if (previewActive || loading || !isAuthenticated || effectiveRole) return;
    void refreshAuthState();
  }, [previewActive, loading, isAuthenticated, effectiveRole, refreshAuthState]);

  useEffect(() => {
    if (previewActive || loading || !isAuthenticated || effectiveRole) {
      setRoleWaitExpired(false);
      return undefined;
    }
    const timer = setTimeout(() => setRoleWaitExpired(true), ROLE_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [previewActive, loading, isAuthenticated, effectiveRole]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Keep a quiet loader while role hydrates — never flash /register mid-login.
  // Admins and existing accounts must not be sent to signup if role is slow/missing.
  if (!previewActive && isAuthenticated && !effectiveRole) {
    if (!roleWaitExpired) {
      return <AuthLoadingScreen />;
    }
    return <Navigate to="/login" replace state={{ roleResolveFailed: true }} />;
  }

  if (!allowedRoles.includes(effectiveRole)) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={ROLE_HOME[effectiveRole] || '/login'} replace />;
  }

  const setupPath = ROLE_SETUP[effectiveRole];
  const onSetupPath = location.pathname.startsWith('/setup/');

  if (shouldLoadCandidateProfile && candidateProfileLoading) {
    return <AuthLoadingScreen />;
  }

  if (
    shouldLoadCandidateProfile &&
    !onSetupPath &&
    !location.pathname.startsWith(ONBOARDING_ROUTE) &&
    shouldShowCandidateOnboarding(candidateProfile)
  ) {
    return <Navigate to={ONBOARDING_ROUTE} replace state={{ from: location }} />;
  }

  // Gate users whose bootstrap identity is missing into the legacy setup
  // assistant. Personal accounts only reach this as a technical fallback when
  // profile provisioning failed or a legacy row has no minimum identity.
  if (!previewActive && setupPath && !setupComplete && !onSetupPath) {
    return <Navigate to={setupPath} replace />;
  }

  return <Outlet />;
}
