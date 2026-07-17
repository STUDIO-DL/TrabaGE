import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { LEGAL_DATE, LEGAL_ROUTES, LEGAL_VERSION } from '../../constants/legalRoutes';
import { APP_VERSION, ZARREL_URL } from '../../constants/zarrel';
import { SUPPORT_EMAIL } from '../../constants/support';
import { usePageTitle } from '../../hooks/usePageTitle';

const INFO_ROWS = [
  { label: 'Aplicación', value: 'TrabaGE' },
  { label: 'Versión de la app', value: APP_VERSION },
  { label: 'Documentos legales', value: `v${LEGAL_VERSION} · ${LEGAL_DATE}` },
  { label: 'Plataformas', value: 'Web App · PWA · Móvil' },
  { label: 'Soporte', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
];

export default function AppInfo() {
  usePageTitle('Información de la app | TrabaGE');

  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link
            to="/about"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Información de la app
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 py-8">
        <div className="flex justify-center">
          <TrabaGEWordmark className="h-8 w-auto" />
        </div>

        <ul className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {INFO_ROWS.map((row) => (
            <li
              key={row.label}
              className="flex items-baseline justify-between gap-4 px-4 py-3.5 text-sm"
            >
              <span className="shrink-0 text-slate-500 dark:text-slate-400">{row.label}</span>
              {row.href ? (
                <a
                  href={row.href}
                  className="truncate text-right font-medium text-primary-600 hover:text-primary-700"
                >
                  {row.value}
                </a>
              ) : (
                <span className="truncate text-right font-medium text-slate-900 dark:text-slate-100">
                  {row.value}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          <Link to={LEGAL_ROUTES.privacy} className="font-medium text-primary-600 hover:text-primary-700">
            Política de Privacidad
          </Link>
          <Link to={LEGAL_ROUTES.terms} className="font-medium text-primary-600 hover:text-primary-700">
            Términos y Condiciones
          </Link>
          <Link to={LEGAL_ROUTES.legalNotice} className="font-medium text-primary-600 hover:text-primary-700">
            Aviso Legal / Propiedad Intelectual
          </Link>
          <a
            href={ZARREL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-700"
          >
            zarrel.org
          </a>
        </div>

        <div className="mt-10 flex justify-center border-t border-slate-100 pt-6 dark:border-slate-800">
          <ZarrelCredit variant="powered" />
        </div>
      </div>
    </div>
  );
}
