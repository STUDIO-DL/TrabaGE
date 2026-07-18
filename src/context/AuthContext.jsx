import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';
import { authService, isEmailVerified } from '../services/auth.service';
import { isAuthConfirmPath } from '../constants/authUrls';
import { clearSentryUser, setSentryUser } from '../config/sentry';
import { clearOneSignalUserId, setOneSignalUserId } from '../config/onesignal';
import {
  ROLE_HOME,
  ROLE_SETUP,
  ROLES,
  isEmployerRole,
  isPersonalRole,
  normalizeRole,
} from '../constants/roles';
import {
  clearPreviewMode,
  getPreviewMode,
  getPreviewRole,
  isPreviewActive,
  PREVIEW_USER,
  setPreviewModeActive,
  setPreviewRoleStorage,
} from '../constants/preview';
import { resolvePostAuthRedirect } from '../utils/resolvePostAuthRedirect';
import { completePostAuthFlow } from '../services/authFlow';
import { bootstrapProfile } from '../services/profileBootstrap';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { isProfileSetupComplete } from '../utils/profileRequirements';
import { reportError } from '../utils/logger';
import { queryClient } from '../config/queryClient';

const AuthContext = createContext(null);

const ONBOARDING_KEY = 'trabage_onboarding_complete';

export const getOnboardingComplete = () =>
  localStorage.getItem(ONBOARDING_KEY) === 'true';

export const setOnboardingComplete = () =>
  localStorage.setItem(ONBOARDING_KEY, 'true');

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndSetup = useCallback(async (userId, userRole) => {
    const normalized = normalizeRole(userRole) ?? userRole;
    setRole(normalized);

    if (isPersonalRole(normalized)) {
      const { data } = await profileService.getCandidateProfile(userId);
      setSetupComplete(isProfileSetupComplete(ROLES.PERSONAL, data));
    } else if (isEmployerRole(normalized)) {
      const { data } = await companyService.getCompanyProfile(userId);
      const role =
        normalizeRole(normalized, { companyType: data?.company_type }) ?? ROLES.BUSINESS;
      setRole(role);
      setSetupComplete(isProfileSetupComplete(role, data));
    } else if (normalized === ROLES.ADMIN) {
      setSetupComplete(true);
    }
  }, []);

  const hydratePreview = useCallback(() => {
    setIsPreviewMode(true);
    setUser(PREVIEW_USER);
    setSession({ user: PREVIEW_USER });
    const savedRole = getPreviewRole();
    if (savedRole) {
      setRole(savedRole);
      setSetupComplete(true);
    } else {
      setRole(null);
      setSetupComplete(false);
    }
  }, []);

  const hydrateUser = useCallback(async (currentSession) => {
    const currentUser = currentSession?.user ?? null;
    setSession(currentSession);
    setUser(currentUser);

    if (!currentUser) {
      setRole(null);
      setSetupComplete(false);
      clearSentryUser();
      void clearOneSignalUserId();
      return;
    }

    // Defense in depth: Supabase should not issue password sessions before
    // confirmation, but TrabaGE never hydrates an unverified session.
    // On /auth/confirm, avoid signOut() while the page exchanges the token.
    if (!isEmailVerified(currentUser)) {
      const onConfirmRoute =
        typeof window !== 'undefined' && isAuthConfirmPath(window.location.pathname);

      setSession(null);
      setUser(null);
      setRole(null);
      setSetupComplete(false);
      clearSentryUser();
      void clearOneSignalUserId();

      if (!onConfirmRoute) {
        void supabase.auth.signOut({ scope: 'local' });
      }
      return;
    }

    try {
      setSentryUser(currentUser);
      void setOneSignalUserId(currentUser.id);

      // Resolve role and both profiles in parallel instead of fetching the role
      // first and then the matching profile in series. This halves the blocking
      // network latency before the UI can render the authenticated state.
      const [roleResult, candidateResult, companyResult] = await Promise.all([
        authService.getUserRole(currentUser.id),
        profileService.getCandidateProfile(currentUser.id),
        companyService.getCompanyProfile(currentUser.id),
      ]);

      let userRole = roleResult?.data?.role ?? null;

      if (!userRole) {
        if (companyResult?.data?.user_id) {
          userRole = normalizeRole(ROLES.BUSINESS, {
            companyType: companyResult.data.company_type,
          });
        } else if (candidateResult?.data?.user_id) {
          userRole = ROLES.PERSONAL;
        }
      } else {
        userRole =
          normalizeRole(userRole, { companyType: companyResult?.data?.company_type }) ?? userRole;
      }

      if (!roleResult?.data?.role && userRole && currentUser.id && userRole !== ROLES.ADMIN) {
        await authService.setUserRole(currentUser.id, userRole);
      }

      setRole(userRole);

      if (userRole && userRole !== ROLES.ADMIN) {
        await bootstrapProfile({ user: currentUser, role: userRole });
      }

      if (isPersonalRole(userRole)) {
        const { data: candidateAfterBootstrap } = await profileService.getCandidateProfile(currentUser.id);
        setSetupComplete(isProfileSetupComplete(ROLES.PERSONAL, candidateAfterBootstrap));
      } else if (isEmployerRole(userRole)) {
        const { data: companyAfterBootstrap } = await companyService.getCompanyProfile(currentUser.id);
        const resolvedRole =
          normalizeRole(userRole, { companyType: companyAfterBootstrap?.company_type }) ?? userRole;
        setRole(resolvedRole);
        setSetupComplete(isProfileSetupComplete(resolvedRole, companyAfterBootstrap));
      } else if (userRole === ROLES.ADMIN) {
        setSetupComplete(true);
      } else {
        setSetupComplete(false);
      }
    } catch (err) {
      reportError(err, { area: 'auth_hydrate_user', userId: currentUser.id });
      setRole(null);
      setSetupComplete(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (getPreviewMode()) {
      hydratePreview();
      setLoading(false);
      return undefined;
    }

    authService
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        return hydrateUser(data.session);
      })
      .catch((err) => {
        reportError(err, { area: 'auth_initial_session' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (getPreviewMode()) return;
      if (event === 'TOKEN_REFRESHED') {
        if (newSession) setSession(newSession);
        return;
      }
      // Defer Supabase API calls: awaiting them inside this callback deadlocks
      // the auth client during OAuth (SIGNED_IN on /auth/callback).
      setTimeout(() => {
        void hydrateUser(newSession);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUser, hydratePreview]);

  const enterPreviewMode = useCallback(() => {
    clearPreviewMode();
    setPreviewModeActive();
    setIsPreviewMode(true);
    setUser(PREVIEW_USER);
    setSession({ user: PREVIEW_USER });
    setRole(null);
    setSetupComplete(false);
  }, []);

  const enterPreviewModeAsRole = useCallback((previewRole) => {
    clearPreviewMode();
    setPreviewModeActive();
    setPreviewRoleStorage(previewRole);
    setIsPreviewMode(true);
    setUser(PREVIEW_USER);
    setSession({ user: PREVIEW_USER });
    setRole(previewRole);
    setSetupComplete(true);
  }, []);

  const setPreviewRole = useCallback((nextRole) => {
    setPreviewRoleStorage(nextRole);
    setRole(nextRole);
    setSetupComplete(true);
  }, []);

  const login = useCallback(async (email, password) => {
    clearPreviewMode();
    setIsPreviewMode(false);

    const { data, error } = await authService.login(email.trim().toLowerCase(), password);
    if (error) return { data, error, redirectTo: null };

    const { data: sessionData } = await authService.getSession();
    const session = sessionData?.session ?? data?.session;
    if (!session) {
      return { data, error: { message: 'No se pudo iniciar sesión' }, redirectTo: null };
    }

    const flow = await completePostAuthFlow(session.user, { preferProfile: false });
    if (flow.error) return { data, error: flow.error, redirectTo: null };

    await hydrateUser(session);

    if (flow.needsAccountTypeSelection) {
      return { data, error: null, redirectTo: '/register' };
    }

    return { data, error: null, redirectTo: flow.redirectTo };
  }, [hydrateUser]);

  const register = useCallback(async (email, password, userRole, metadata = {}) => {
    clearPreviewMode();
    setIsPreviewMode(false);

    const { data, error, pendingVerification, rateLimited } = await authService.register(
      email,
      password,
      userRole,
      metadata,
    );
    if (error) return { data, error, redirectTo: null };

    if (pendingVerification || !data?.session?.user?.id) {
      return {
        data,
        error: null,
        redirectTo: null,
        pendingVerification: true,
        rateLimited: rateLimited === true,
      };
    }

    await hydrateUser(data.session);
    const redirectTo = await resolvePostAuthRedirect(data.session.user.id, null, {
      preferProfile: true,
    });

    return { data, error: null, redirectTo };
  }, [hydrateUser]);

  const logout = useCallback(async () => {
    if (isPreviewMode || getPreviewMode()) {
      clearPreviewMode();
      setIsPreviewMode(false);
      setSession(null);
      setUser(null);
      setRole(null);
      setSetupComplete(false);
      queryClient.clear();
      return;
    }

    await authService.logout();
    queryClient.clear();
    setSession(null);
    setUser(null);
    setRole(null);
    setSetupComplete(false);
  }, [isPreviewMode]);

  const refreshSetupStatus = useCallback(async () => {
    if (isPreviewMode) {
      setSetupComplete(true);
      return;
    }
    if (!user?.id || !role) return;
    await fetchRoleAndSetup(user.id, role);
  }, [user, role, fetchRoleAndSetup, isPreviewMode]);

  const refreshAuthState = useCallback(async () => {
    if (isPreviewMode || getPreviewMode()) return;
    const { data } = await authService.getSession();
    if (data?.session) {
      await hydrateUser(data.session);
    }
  }, [hydrateUser, isPreviewMode]);

  const resendVerificationEmail = useCallback(async (email) => {
    return authService.resendVerificationEmail(email);
  }, []);

  const getHomePath = useCallback(() => {
    // Bootstrap identity incomplete → setup assistant (edge cases only, e.g.
    // Google org without a company name). Otherwise → role home (feed/dashboard).
    // Edit Intro / profile editor collect enrichment; never block app access for
    // missing headline or company description.
    const previewActive = isPreviewMode || getPreviewMode();
    const activeRole = role ?? (previewActive ? getPreviewRole() : null);
    if (!activeRole) return null;
    if (!previewActive && ROLE_SETUP[activeRole] && !setupComplete) {
      return ROLE_SETUP[activeRole];
    }
    return ROLE_HOME[activeRole] || '/login';
  }, [role, setupComplete, isPreviewMode]);

  const value = useMemo(
    () => {
      const emailVerified = isEmailVerified(user);
      return {
      session,
      user,
      role,
      setupComplete,
      loading,
      isPreviewMode,
      emailVerified,
      isAuthenticated:
        (Boolean(session?.user) && emailVerified) || isPreviewActive(isPreviewMode),
      login,
      register,
      logout,
      enterPreviewMode,
      enterPreviewModeAsRole,
      setPreviewRole,
      refreshSetupStatus,
      refreshAuthState,
      resendVerificationEmail,
      getHomePath,
      setSetupComplete,
      };
    },
    [
      session,
      user,
      role,
      setupComplete,
      loading,
      isPreviewMode,
      login,
      register,
      logout,
      enterPreviewMode,
      enterPreviewModeAsRole,
      setPreviewRole,
      refreshSetupStatus,
      refreshAuthState,
      resendVerificationEmail,
      getHomePath,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
