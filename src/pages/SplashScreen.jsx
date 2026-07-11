import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import EquatorialGuineaMap from '../components/splash/EquatorialGuineaMap';
import TrabaGEWordmark from '../components/splash/TrabaGEWordmark';
import { getOnboardingComplete } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';

// Tiempo mínimo que se muestra el splash por marca/UX. La navegación real
// espera además a que termine la restauración de la sesión (loading === false),
// de modo que un usuario con sesión válida vaya directo a su inicio.
const MIN_SPLASH_MS = 1800;
const ROLE_WAIT_MS = 4000;

export default function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, role, getHomePath, loading, logout } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minTimeElapsed || !isAuthenticated || role) {
      setRoleWaitExpired(false);
      return undefined;
    }
    const timer = setTimeout(() => setRoleWaitExpired(true), ROLE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [loading, minTimeElapsed, isAuthenticated, role]);

  useEffect(() => {
    // No decidimos el destino hasta que la sesión de Supabase haya terminado de
    // restaurarse (loading) y haya pasado el tiempo mínimo de splash. Así se
    // evita mandar a /login a un usuario que en realidad sí tiene sesión.
    if (loading || !minTimeElapsed) return;

    if (isAuthenticated) {
      // Wait for role hydration on the splash itself — never flash /register
      // as an intermediate screen while the profile/role is still loading.
      if (!role) {
        if (!roleWaitExpired) return;
        void logout().then(() => navigate('/login', { replace: true }));
        return;
      }
      const home = getHomePath();
      navigate(home || '/login', { replace: true });
      return;
    }

    // Para un usuario no autenticado, comprobamos si ya ha visto el onboarding.
    // Si no lo ha visto, le llevamos a la nueva ruta `/onboarding`.
    // Si ya lo vio, le llevamos directamente a la pantalla de login.
    const destination = getOnboardingComplete() ? '/login' : '/onboarding';
    navigate(destination, { replace: true });
  }, [
    loading,
    minTimeElapsed,
    isAuthenticated,
    role,
    roleWaitExpired,
    getHomePath,
    navigate,
    logout,
  ]);

  return (
    <MobileScreenLayout
      contentClassName="items-center justify-center px-md"
      noScroll
      className="bg-white"
    >
      <div className="flex flex-col items-center text-center">
        <TrabaGEWordmark className="splash-logo-in h-10 w-auto sm:h-11" />

        <EquatorialGuineaMap
          className="splash-map-in splash-map-glow mt-lg h-8 w-auto text-primary-600 sm:h-9"
        />

        <p className="splash-tagline-in mt-lg max-w-[16rem] text-small leading-snug text-slate-500 sm:max-w-xs sm:text-body">
          La plataforma de empleo y oportunidades para Guinea Ecuatorial
        </p>
      </div>
    </MobileScreenLayout>
  );
}
