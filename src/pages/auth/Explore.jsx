import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import logoImg from '../../assets/branding/trabage-icon.png';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
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
    label: 'Soy empresa / institución',
    description: 'Explora el panel de organización, publicaciones y candidatos.',
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
    <MobileScreenLayout bg="bg-[#F8FAFC]" maxWidth="max-w-lg">
      <div className="login-fade-in flex flex-1 flex-col px-md pb-md pt-sm">
        <img
          src={logoImg}
          alt="TrabaGE"
          width={96}
          height={96}
          className="mx-auto h-24 w-24 object-contain"
          decoding="async"
        />

        <div className="mt-md text-center">
          <h1 className="text-heading-m font-bold text-[#0F172A]">¿Cómo quieres explorar?</h1>
          <p className="mt-xs text-small text-[#64748B]">
            Elige una experiencia. Puedes navegar libremente, pero necesitarás una cuenta para interactuar.
          </p>
        </div>

        <div className="mt-md flex min-h-0 flex-1 flex-col justify-center gap-sm">
          {ROLE_OPTIONS.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectRole(id)}
              className="group flex w-full items-start gap-md rounded-2xl border border-slate-200 bg-white p-md text-left shadow-sm transition hover:border-primary-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#0F172A]">{label}</span>
                <span className="mt-xs block text-small leading-relaxed text-[#64748B]">{description}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-md shrink-0 text-center text-small text-[#64748B]">
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
