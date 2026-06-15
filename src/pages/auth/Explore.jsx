import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import logoImg from '../../assets/branding/logo.png';
import { getPreviewMode } from '../../constants/preview';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

const ROLE_OPTIONS = [
  {
    id: ROLES.CANDIDATE,
    label: 'Soy candidato',
    description: 'Explora ofertas de empleo, empresas y oportunidades.',
    icon: User,
  },
  {
    id: ROLES.COMPANY,
    label: 'Soy empresa',
    description: 'Explora el panel de empresa, publicaciones y candidatos.',
    icon: Building2,
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
    <div className="login-shell">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="login-fade-in w-full max-w-lg">
          <img
            src={logoImg}
            alt="TrabaGE"
            width={140}
            height={34}
            className="mx-auto h-8 w-auto"
            decoding="async"
          />

          <div className="mt-8 text-center">
            <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
              ¿Cómo quieres explorar?
            </h1>
            <p className="mt-2 text-sm text-[#64748B] sm:text-base">
              Elige una experiencia. Puedes navegar libremente, pero necesitarás una cuenta para
              interactuar.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {ROLE_OPTIONS.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectRole(id)}
                className="group flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#0F172A]">{label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[#64748B]">
                    {description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-[#64748B]">
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
      </div>
    </div>
  );
}
