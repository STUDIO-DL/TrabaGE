import ZarrelCredit from '../../components/branding/ZarrelCredit';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { SUPPORT_EMAIL } from '../../constants/support';
import { usePageTitle } from '../../hooks/usePageTitle';

/**
 * Public maintenance surface. Shown when the platform is under maintenance.
 * Branding credit only — no product chrome (feed/jobs/profiles).
 */
export default function Maintenance() {
  usePageTitle('Mantenimiento | TrabaGE');

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#EFF6FF] via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <TrabaGEWordmark className="h-9 w-auto" />
        <h1 className="mt-8 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Estamos en mantenimiento
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          TrabaGE no está disponible temporalmente mientras mejoramos el servicio. Vuelve a
          intentarlo en unos minutos.
        </p>
        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Si necesitas ayuda, escribe a{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>

      <div className="pb-8 pt-4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center">
          <ZarrelCredit variant="developed" />
        </div>
      </div>
    </div>
  );
}
