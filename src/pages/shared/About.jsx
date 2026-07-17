import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { ROLES, isEmployerRole, rolePath } from '../../constants/roles';
import { APP_VERSION, ZARREL_NAME, ZARREL_URL } from '../../constants/zarrel';
import { useAuth } from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';

function settingsFallback(role) {
  if (isEmployerRole(role)) return rolePath(role, '/settings');
  if (role === ROLES.ADMIN) return '/admin/settings';
  if (role === ROLES.PERSONAL) return rolePath(ROLES.PERSONAL, '/settings');
  return '/login';
}

export default function About() {
  const navigate = useNavigate();
  const { role } = useAuth();
  usePageTitle('Acerca de TrabaGE | TrabaGE');

  const handleBack = () => {
    // Prefer in-app history (e.g. Settings → About). Fall back when opened cold.
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(settingsFallback(role), { replace: true });
  };

  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Acerca de TrabaGE</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 py-8">
        <div className="flex justify-center">
          <TrabaGEWordmark className="h-9 w-auto" />
        </div>

        <h1 className="mt-6 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Donde las oportunidades te encuentran
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          TrabaGE conecta talento, Business y Organizaciones en Guinea Ecuatorial. Perfiles
          profesionales, ofertas de empleo y una comunidad pensada para crecer.
        </p>

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Diseñado para cuentas personales que buscan su próximo paso y para Business y
            Organizaciones que necesitan encontrar el talento adecuado — con verificación,
            postulaciones y herramientas claras.
          </p>
          <p>
            TrabaGE fue diseñado y desarrollado por{' '}
            <a
              href={ZARREL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 hover:text-primary-700"
            >
              {ZARREL_NAME}
            </a>
            , empresa de software, diseño digital y soluciones tecnológicas.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2 text-center text-sm">
          <Link
            to="/app-info"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Información de la app
          </Link>
          <Link to={LEGAL_ROUTES.privacy} className="text-slate-500 hover:text-slate-700">
            Política de Privacidad
          </Link>
          <Link to={LEGAL_ROUTES.terms} className="text-slate-500 hover:text-slate-700">
            Términos y Condiciones
          </Link>
          <Link to={LEGAL_ROUTES.legalNotice} className="text-slate-500 hover:text-slate-700">
            Aviso Legal / Propiedad Intelectual
          </Link>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-slate-100 pt-6 dark:border-slate-800">
          <p className="text-[11px] text-slate-400">Versión {APP_VERSION}</p>
          <ZarrelCredit variant="developed" />
        </div>
      </div>
    </div>
  );
}
