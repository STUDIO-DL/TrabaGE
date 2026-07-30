import { useNavigate } from 'react-router-dom';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { getPreviewMode } from '../../constants/preview';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { useEffect } from 'react';

const ROLE_OPTIONS = [
  {
    id: ROLES.PERSONAL,
    label: 'Cuenta personal',
    description: 'Explora ofertas de empleo, Business y oportunidades.',
  },
  {
    id: ROLES.BUSINESS,
    label: 'Business / Organización',
    description: 'Explora el panel, publicaciones y talento interesado.',
  },
];

export default function Explore() {
  const navigate = useNavigate();
  const { enterPreviewMode, enterPreviewModeAsRole } = useAuth();

  useEffect(() => {
    if (!getPreviewMode()) {
      enterPreviewMode();
    }
  }, [enterPreviewMode]);

  const selectRole = (role) => {
    enterPreviewModeAsRole(role);
    navigate(ROLE_HOME[role], { replace: true });
  };

  return (
    <MobileScreenLayout bg="bg-app-surface" maxWidth="max-w-lg">
      <div className="login-fade-in relative flex flex-1 flex-col px-space-md pb-space-md pt-space-sm">
        <div className="relative text-center">
          <TrabaGEWordmark size="hero" className="mx-auto" />
        </div>

        <div className="mt-space-md text-center">
          <h1 className="text-title font-semibold tracking-tight text-app-text">
            ¿Cómo quieres explorar?
          </h1>
          <p className="mt-space-xs text-body-small text-app-muted">
            Elige una experiencia. Puedes navegar libremente, pero necesitarás una cuenta para
            interactuar.
          </p>
        </div>

        <div className="mt-space-md flex min-h-0 flex-1 flex-col justify-center gap-space-sm">
          {ROLE_OPTIONS.map(({ id, label, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectRole(id)}
              className="w-full rounded-radius-lg border border-app-border bg-app-card p-space-md text-left transition-colors duration-fast hover:border-app-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span className="block font-semibold text-app-text">{label}</span>
              <span className="mt-space-xs block text-body-small leading-relaxed text-app-muted">
                {description}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-space-md shrink-0 text-center text-body-small text-app-muted">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </MobileScreenLayout>
  );
}
