import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';
import { authService } from '../services/auth.service';
import { clearSentryUser, setSentryUser } from '../config/sentry';
import { clearOneSignalUserId, setOneSignalUserId } from '../config/onesignal';
import { ROLE_HOME, ROLE_SETUP, ROLES } from '../constants/roles';
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
  const [loading, setLoading] = useState(true);

  const fetchRoleAndSetup = useCallback(async (userId, userRole) => {
    setRole(userRole);

    if (userRole === ROLES.CANDIDATE) {
      const { data } = await profileService.getCandidateProfile(userId);
      setSetupComplete(Boolean(data?.setup_complete));
    } else if (userRole === ROLES.COMPANY) {
      const { data } = await companyService.getCompanyProfile(userId);
      setSetupComplete(Boolean(data?.setup_complete));
    } else {
      setSetupComplete(true);
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
      clearOneSignalUserId();
      return;
    }

    setSentryUser(currentUser);
    setOneSignalUserId(currentUser.id);

    const { data: roleData } = await authService.getUserRole(currentUser.id);
    const userRole = roleData?.role ?? ROLES.CANDIDATE;
    await fetchRoleAndSetup(currentUser.id, userRole);
  }, [fetchRoleAndSetup]);

  useEffect(() => {
    let mounted = true;

    authService.getSession().then(({ data }) => {
      if (!mounted) return;
      hydrateUser(data.session).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      hydrateUser(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await authService.login(email, password);
    return { data, error };
  }, []);

  const register = useCallback(async (email, password, userRole) => {
    const { data, error } = await authService.register(email, password, userRole);
    return { data, error };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
    setUser(null);
    setRole(null);
    setSetupComplete(false);
  }, []);

  const refreshSetupStatus = useCallback(async () => {
    if (!user?.id || !role) return;
    await fetchRoleAndSetup(user.id, role);
  }, [user, role, fetchRoleAndSetup]);

  const getHomePath = useCallback(() => {
    if (!role) return '/login';
    if (!setupComplete && ROLE_SETUP[role]) return ROLE_SETUP[role];
    return ROLE_HOME[role] || '/login';
  }, [role, setupComplete]);

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      setupComplete,
      loading,
      isAuthenticated: Boolean(session),
      login,
      register,
      logout,
      refreshSetupStatus,
      getHomePath,
      setSetupComplete,
    }),
    [
      session,
      user,
      role,
      setupComplete,
      loading,
      login,
      register,
      logout,
      refreshSetupStatus,
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
