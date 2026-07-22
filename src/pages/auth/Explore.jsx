import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { getPreviewMode } from '../../constants/preview';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

const ROLE_OPTIONS = [
  {
    id: ROLES.PERSONAL,
    label: 'Cuenta personal',
    description: 'Explora ofertas de empleo, Business y oportunidades.',
    icon: User,
  },
  {
    id: ROLES.BUSINESS,
    label: 'Business / Organización',
    description: 'Explora el panel, publicaciones y talento interesado.',
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
      <div className="login-fade-in relative flex flex-1 flex-col px-md pb-md pt-sm">
        <div className="pointer-events-none absolute left-1/2 top-2 h-32 w-32 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-200/40 via-sky-100/60 to-transparent blur-3xl" />

        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-primary-100/80 bg-white/85 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl ring-1 ring-primary-100/70">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/90 via-primary-50/40 to-transparent" />
          <span className="relative text-[2.15rem] font-black tracking-[0.04em] text-primary-600" aria-label="TrabaGE">
            T
          </span>
        </div>

        <div className="mt-md text-center">
          <h1 className="text-title font-bold text-[#0F172A]">¿Cómo quieres explorar?</h1>
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
