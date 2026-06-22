import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';
import { authService } from '../services/auth.service';
import { clearSentryUser, setSentryUser } from '../config/sentry';
import { clearOneSignalUserId, setOneSignalUserId } from '../config/onesignal';
import { ROLE_HOME, ROLES } from '../constants/roles';
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
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';

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
    setRole(userRole);

    if (userRole === ROLES.CANDIDATE) {
      const { data } = await profileService.getCandidateProfile(userId);
      setSetupComplete(Boolean(data?.setup_complete));
    } else if (userRole === ROLES.COMPANY) {
      const { data } = await companyService.getCompanyProfile(userId);
      setSetupComplete(Boolean(data?.setup_complete));
    } else if (userRole === ROLES.ADMIN) {
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
        userRole = ROLES.COMPANY;
      } else if (candidateResult?.data?.user_id) {
        userRole = ROLES.CANDIDATE;
      }
    }

    if (!roleResult?.data?.role && userRole && currentUser.id && userRole !== ROLES.ADMIN) {
      await authService.setUserRole(currentUser.id, userRole);
    }

    setRole(userRole);

    if (userRole === ROLES.CANDIDATE) {
      setSetupComplete(Boolean(candidateResult?.data?.setup_complete));
    } else if (userRole === ROLES.COMPANY) {
      setSetupComplete(Boolean(companyResult?.data?.setup_complete));
    } else if (userRole === ROLES.ADMIN) {
      setSetupComplete(true);
    } else {
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

    const authTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    authService
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        return hydrateUser(data.session);
      })
      .catch((err) => {
        console.warn('[TrabaGE] No se pudo conectar con Supabase:', err?.message || err);
      })
      .finally(() => {
        clearTimeout(authTimeout);
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (getPreviewMode()) return;
      // Defer Supabase API calls: awaiting them inside this callback deadlocks
      // the auth client during OAuth (SIGNED_IN on /auth/callback).
      setTimeout(() => {
        void hydrateUser(newSession);
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
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

    await hydrateUser(session);

    const redirectTo = await resolvePostAuthRedirect(session.user.id);

    return { data, error: null, redirectTo };
  }, [hydrateUser]);

  const register = useCallback(async (email, password, userRole) => {
    clearPreviewMode();
    setIsPreviewMode(false);

    const { data, error } = await authService.register(email, password, userRole);
    if (error) return { data, error, redirectTo: null };

    // Per the new flow, email sign-up always requires verification. `register`
    // no longer returns a session. The UI is responsible for showing the
    // "check your email" message. `redirectTo` will be null here.
    const session = data?.session;
    if (!session?.user?.id) {
      return { data, error: null, redirectTo: null };
    }

    await hydrateUser(session);
    const redirectTo = await resolvePostAuthRedirect(session.user.id);

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
      return;
    }

    await authService.logout();
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

  const getHomePath = useCallback(() => {
    // Profile setup is optional: we always resolve to the role-based home and no
    // longer redirect setup-incomplete users into the setup flow. The
    // `setupComplete` flag remains available for showing an optional prompt.
    const activeRole = role ?? (getPreviewMode() ? getPreviewRole() : null);
    if (!activeRole) return '/account-type';
    return ROLE_HOME[activeRole] || '/login';
  }, [role]);

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      setupComplete,
      loading,
      isPreviewMode,
      isAuthenticated: Boolean(session?.user) || isPreviewActive(isPreviewMode),
      login,
      register,
      logout,
      enterPreviewMode,
      enterPreviewModeAsRole,
      setPreviewRole,
      refreshSetupStatus,
      refreshAuthState,
      getHomePath,
      setSetupComplete,
    }),
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
