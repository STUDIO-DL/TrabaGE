import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { authService, isEmailVerified } from '../services/auth.service';
import { isAuthConfirmPath } from '../constants/authUrls';
import { clearSentryUser, setSentryUser } from '../config/sentry';
import { clearOneSignalUserId, bindOneSignalUser, isOneSignalConfigured } from '../config/onesignal';
import { notificationPreferencesService } from '../services/notificationPreferences.service';
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
import {
  clearAuthResumeCache,
  isNativeFilePickActive,
  isWithinForegroundGrace,
  markAppForeground,
  readAuthResumeCache,
  writeAuthResumeCache,
} from '../utils/appLifecycle';
import { getOwnCandidateProfileKey, getOwnCompanyProfileKey } from '../constants/profileQueryKeys';
import {
  hasCandidateSections,
  mergeCandidateProfileRow,
} from '../utils/candidateProfileSections';

const AuthContext = createContext(null);

const ONBOARDING_KEY = 'trabage_onboarding_complete';

export const getOnboardingComplete = () =>
  localStorage.getItem(ONBOARDING_KEY) === 'true';

export const setOnboardingComplete = () =>
  localStorage.setItem(ONBOARDING_KEY, 'true');

/**
 * Seed the own-candidate React Query cache with a FULL profile (including education).
 * Writing a base-only row here previously made Educación disappear after refresh:
 * staleTime treated the incomplete cache as fresh, so useProfile never re-fetched sections.
 */
async function seedOwnCandidateProfileCache(userId, baseProfile) {
  if (!userId || !baseProfile?.user_id) return null;
  const key = getOwnCandidateProfileKey(userId);
  const existing = queryClient.getQueryData(key);

  if (hasCandidateSections(baseProfile)) {
    queryClient.setQueryData(key, baseProfile);
    return baseProfile;
  }

  if (hasCandidateSections(existing)) {
    const merged = mergeCandidateProfileRow(existing, baseProfile);
    queryClient.setQueryData(key, merged);
    return merged;
  }

  const { data: full, error } = await profileService.getCandidateFullProfile(userId);
  if (!error && full) {
    queryClient.setQueryData(key, full);
    return full;
  }

  // Never leave a base-only profile in cache — Profile would show empty Educación.
  queryClient.removeQueries({ queryKey: key });
  return null;
}

function readInitialAuthCache() {
  if (typeof window === 'undefined') return null;
  return readAuthResumeCache();
}

/** Best-effort session from Supabase persist key so cold start within grace keeps routes mounted. */
function readOptimisticSession(cache) {
  if (typeof window === 'undefined' || !cache?.userId) return null;
  try {
    const raw = localStorage.getItem('trabage-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session =
      parsed?.currentSession ??
      parsed?.session ??
      (parsed?.access_token && parsed?.user ? parsed : null);
    if (!session?.access_token || !session?.user?.id) return null;
    if (session.user.id !== cache.userId) return null;
    if (!isEmailVerified(session.user)) return null;
    return session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const initialCacheRef = useRef(readInitialAuthCache());
  const optimisticSessionRef = useRef(readOptimisticSession(initialCacheRef.current));
  const [session, setSession] = useState(() => optimisticSessionRef.current);
  const [user, setUser] = useState(() => optimisticSessionRef.current?.user ?? null);
  const [role, setRole] = useState(() => initialCacheRef.current?.role ?? null);
  const [setupComplete, setSetupComplete] = useState(
    () => Boolean(initialCacheRef.current?.setupComplete),
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  // Within 5-minute grace with cached identity: stay interactive (no AuthLoadingScreen remount).
  const [loading, setLoading] = useState(() => !optimisticSessionRef.current);
  /** True while role/profile hydrate runs after session is known — prevents Register flash. */
  const [hydrating, setHydrating] = useState(false);
  const hydrateGenRef = useRef(0);
  const authEffectGenRef = useRef(0);
  const hydrateRetryRef = useRef(0);
  const userIdRef = useRef(initialCacheRef.current?.userId ?? null);
  const roleRef = useRef(initialCacheRef.current?.role ?? null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

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
    const gen = ++hydrateGenRef.current;
    const currentUser = currentSession?.user ?? null;

    if (!currentUser) {
      // File picker / transient races may emit a null session — keep in-memory auth.
      if (isNativeFilePickActive() && userIdRef.current) {
        if (gen === hydrateGenRef.current) setHydrating(false);
        return;
      }

      // Confirmed null session (e.g. getSession) — clear optimistic/zombie auth
      // even inside foreground grace so stale resume cache cannot fake a login.
      setSession(null);
      setUser(null);
      setRole(null);
      setSetupComplete(false);
      clearAuthResumeCache();
      clearSentryUser();
      void clearOneSignalUserId();
      if (gen === hydrateGenRef.current) setHydrating(false);
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
      if (gen === hydrateGenRef.current) setHydrating(false);

      if (!onConfirmRoute) {
        void supabase.auth.signOut({ scope: 'local' });
      }
      return;
    }

    // Only flip hydrating (and remount protected routes) when we do not already
    // have a resolved account for this same user. Resume/token recovery must not
    // tear down forms, scroll, or in-progress edits.
    const cached = readAuthResumeCache();
    const withinGrace = isWithinForegroundGrace();
    const softResume =
      Boolean(currentUser?.id) &&
      ((userIdRef.current === currentUser.id && Boolean(roleRef.current)) ||
        (withinGrace &&
          cached?.userId === currentUser.id &&
          Boolean(cached?.role)) ||
        // Cold start within grace: same user from optimistic seed, role may still load.
        (withinGrace && userIdRef.current === currentUser.id));

    if (softResume && cached?.role && !roleRef.current) {
      roleRef.current = cached.role;
      userIdRef.current = cached.userId;
      setRole(cached.role);
      setSetupComplete(Boolean(cached.setupComplete));
    }

    if (!softResume) {
      setHydrating(true);
    }
    setSession(currentSession);
    setUser(currentUser);

    let keepHydrating = false;

    try {
      setSentryUser(currentUser);

      // Resolve role and both profiles in parallel instead of fetching the role
      // first and then the matching profile in series. This halves the blocking
      // network latency before the UI can render the authenticated state.
      const [roleResult, candidateResult, companyResult] = await Promise.all([
        authService.getUserRole(currentUser.id),
        profileService.getCandidateProfile(currentUser.id),
        companyService.getCompanyProfile(currentUser.id),
      ]);

      if (gen !== hydrateGenRef.current) return;

      const roleFetchFailed = Boolean(roleResult?.error);
      if (roleFetchFailed) {
        reportError(roleResult.error, { area: 'auth_hydrate_role', userId: currentUser.id });
      }

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

      // Fetch errors must not be treated as "no role" (that sends users to /register).
      if (
        !userRole &&
        (roleFetchFailed || candidateResult?.error || companyResult?.error)
      ) {
        reportError(roleResult?.error || candidateResult?.error || companyResult?.error, {
          area: 'auth_hydrate_role_unresolved',
          userId: currentUser.id,
        });
        if (hydrateRetryRef.current < 3) {
          hydrateRetryRef.current += 1;
          keepHydrating = true;
          // Keep AuthLoadingScreen up and retry a few times for transient failures.
          window.setTimeout(() => {
            if (hydrateGenRef.current !== gen) return;
            void hydrateUser(currentSession);
          }, 2000);
          return;
        }
        hydrateRetryRef.current = 0;
        return;
      }

      hydrateRetryRef.current = 0;

      if (!roleResult?.data?.role && userRole && currentUser.id && userRole !== ROLES.ADMIN) {
        await authService.setUserRole(currentUser.id, userRole);
      }

      if (gen !== hydrateGenRef.current) return;

      if (candidateResult?.data?.user_id) {
        await seedOwnCandidateProfileCache(currentUser.id, candidateResult.data);
      }
      if (companyResult?.data?.user_id) {
        queryClient.setQueryData(getOwnCompanyProfileKey(currentUser.id), companyResult.data);
      }

      setRole(userRole);
      if (userRole) {
        writeAuthResumeCache({
          userId: currentUser.id,
          role: userRole,
          setupComplete: userRole === ROLES.ADMIN,
        });
      }

      void notificationPreferencesService.getOrCreate(currentUser.id);

      if (isOneSignalConfigured()) {
        void bindOneSignalUser(currentUser.id, {
          role: userRole,
          city: candidateResult?.data?.city ?? companyResult?.data?.city ?? null,
          sector: candidateResult?.data?.sector ?? companyResult?.data?.sector ?? null,
        });
      }

      if (userRole && userRole !== ROLES.ADMIN) {
        const profileInactive = isPersonalRole(userRole)
          ? candidateResult?.data?.is_active === false
          : isEmployerRole(userRole)
            ? companyResult?.data?.is_active === false
            : false;

        if (profileInactive) {
          setSession(null);
          setUser(null);
          setRole(null);
          setSetupComplete(false);
          clearAuthResumeCache();
          clearSentryUser();
          void clearOneSignalUserId();
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
      }

      if (userRole && userRole !== ROLES.ADMIN) {
        await bootstrapProfile({ user: currentUser, role: userRole });
      }

      if (gen !== hydrateGenRef.current) return;

      if (isPersonalRole(userRole)) {
        const { data: candidateAfterBootstrap } = await profileService.getCandidateFullProfile(
          currentUser.id,
        );
        if (gen !== hydrateGenRef.current) return;
        if (candidateAfterBootstrap?.user_id) {
          queryClient.setQueryData(
            getOwnCandidateProfileKey(currentUser.id),
            candidateAfterBootstrap,
          );
        }
        const complete = isProfileSetupComplete(ROLES.PERSONAL, candidateAfterBootstrap);
        setSetupComplete(complete);
        writeAuthResumeCache({
          userId: currentUser.id,
          role: userRole,
          setupComplete: complete,
        });
      } else if (isEmployerRole(userRole)) {
        const { data: companyAfterBootstrap } = await companyService.getCompanyProfile(currentUser.id);
        if (gen !== hydrateGenRef.current) return;
        if (companyAfterBootstrap?.user_id) {
          queryClient.setQueryData(
            getOwnCompanyProfileKey(currentUser.id),
            companyAfterBootstrap,
          );
        }
        const resolvedRole =
          normalizeRole(userRole, { companyType: companyAfterBootstrap?.company_type }) ?? userRole;
        const complete = isProfileSetupComplete(resolvedRole, companyAfterBootstrap);
        setRole(resolvedRole);
        setSetupComplete(complete);
        writeAuthResumeCache({
          userId: currentUser.id,
          role: resolvedRole,
          setupComplete: complete,
        });
      } else if (userRole === ROLES.ADMIN) {
        setSetupComplete(true);
        writeAuthResumeCache({
          userId: currentUser.id,
          role: userRole,
          setupComplete: true,
        });
      } else {
        setSetupComplete(false);
      }
    } catch (err) {
      reportError(err, { area: 'auth_hydrate_user', userId: currentUser.id });
      // Do not clear an already-resolved role — that flashes Register during login.
      setSetupComplete((prev) => prev);
    } finally {
      if (gen === hydrateGenRef.current && !keepHydrating) setHydrating(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const effectId = ++authEffectGenRef.current;

    if (getPreviewMode()) {
      hydratePreview();
      setLoading(false);
    } else {
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
    }

    // Always subscribe so leaving preview / logging in still receives token refresh & sign-out.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      const nextUserId = newSession?.user?.id ?? null;
      const sameUser = Boolean(nextUserId && nextUserId === userIdRef.current);
      const alreadyReady = sameUser && Boolean(roleRef.current);
      const withinGrace = isWithinForegroundGrace();
      if (getPreviewMode()) return;

      if (event === 'TOKEN_REFRESHED') {
        if (newSession) setSession(newSession);
        return;
      }

      // Returning from background (or any re-emit of SIGNED_IN for the same
      // already-hydrated user) must NOT remount the app tree.
      const cached = readAuthResumeCache();
      const cacheReady =
        Boolean(nextUserId) &&
        withinGrace &&
        cached?.userId === nextUserId &&
        Boolean(cached?.role);
      if (cacheReady && !roleRef.current) {
        roleRef.current = cached.role;
        userIdRef.current = cached.userId;
        setRole(cached.role);
        setSetupComplete(Boolean(cached.setupComplete));
      }
      const readyForSoftResume = alreadyReady || cacheReady;
      const filePickSoft =
        isNativeFilePickActive() &&
        Boolean(nextUserId) &&
        (sameUser || cached?.userId === nextUserId);

      if (
        newSession?.user &&
        (readyForSoftResume || filePickSoft) &&
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || withinGrace || filePickSoft)
      ) {
        if (filePickSoft && cached?.role && !roleRef.current) {
          roleRef.current = cached.role;
          userIdRef.current = cached.userId;
          setRole(cached.role);
          setSetupComplete(Boolean(cached.setupComplete));
        }
        setSession(newSession);
        setUser(newSession.user);
        markAppForeground();
        return;
      }

      // Ignore spurious null INITIAL_SESSION (Strict Mode / race) — only SIGNED_OUT clears.
      if (!newSession && event !== 'SIGNED_OUT') {
        if (
          readyForSoftResume ||
          filePickSoft ||
          (withinGrace && (userIdRef.current || cached?.userId))
        ) {
          return;
        }
      }

      // Defer Supabase API calls: awaiting them inside this callback deadlocks
      // the auth client during OAuth (SIGNED_IN on /auth/callback).
      const capturedEvent = event;
      const capturedSession = newSession;
      const capturedEffectId = effectId;
      setTimeout(() => {
        if (!mounted || authEffectGenRef.current !== capturedEffectId) return;
        // Re-check: another mount may have taken over (Strict Mode).
        if (!capturedSession && capturedEvent !== 'SIGNED_OUT') {
          if (userIdRef.current || readAuthResumeCache()?.userId) {
            return;
          }
        }
        void hydrateUser(capturedSession);
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

    const { data, error, pendingVerification, rateLimited, emailDeliveryFailed } =
      await authService.register(
      email,
      password,
      userRole,
      metadata,
    );

    if (error && !pendingVerification) return { data, error, redirectTo: null };

    if (pendingVerification || !data?.session?.user?.id) {
      return {
        data,
        error: null,
        redirectTo: null,
        pendingVerification: true,
        rateLimited: rateLimited === true,
        emailDeliveryFailed: emailDeliveryFailed === true,
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
      clearAuthResumeCache();
      queryClient.clear();
      return;
    }

    await authService.logout();
    queryClient.clear();
    clearAuthResumeCache();
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
      // Include hydrating so GuestOnly/Login never see session-before-role.
      loading: loading || hydrating,
      hydrating,
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
      hydrating,
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
