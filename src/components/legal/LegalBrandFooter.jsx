import { ZARREL_NAME, ZARREL_URL } from '../../constants/zarrel';
import { LEGAL_DATE, LEGAL_SUPPORT_EMAIL, LEGAL_VERSION } from '../../constants/legalRoutes';
import ZarrelCredit from '../branding/ZarrelCredit';
import { LegalFooterLinks } from './LegalLinks';

/**
 * Elegant legal page footer: © TrabaGE + ZARREL attribution + support.
 */
export default function LegalBrandFooter() {
  return (
    <footer className="mt-10 border-t border-slate-100 pt-8 dark:border-slate-800">
      <div className="text-center">
        <p className="text-xs font-medium tracking-tight text-slate-800 dark:text-slate-200">
          © TrabaGE.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          Diseñado y desarrollado por{' '}
          <a
            href={ZARREL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-800 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-slate-100"
          >
            {ZARREL_NAME}
          </a>
          .
        </p>
        <p className="mt-1.5">
          <a
            href={ZARREL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-400 underline decoration-slate-200 underline-offset-2 transition hover:text-slate-600 dark:text-slate-500 dark:decoration-slate-700 dark:hover:text-slate-300"
          >
            {ZARREL_URL.replace(/^https?:\/\//, '')}
          </a>
        </p>
        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
          <a
            href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
            className="transition hover:text-primary-600"
          >
            {LEGAL_SUPPORT_EMAIL}
          </a>
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          v{LEGAL_VERSION} · {LEGAL_DATE}
        </p>
        <div className="mt-5 flex justify-center">
          <ZarrelCredit variant="developed" />
        </div>
        <div className="mt-6">
          <LegalFooterLinks />
        </div>
      </div>
    </footer>
  );
}
