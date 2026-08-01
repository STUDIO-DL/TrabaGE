import { ZARREL_NAME, ZARREL_URL } from '../../constants/zarrel';
import { LEGAL_DATE, LEGAL_SUPPORT_EMAIL, LEGAL_VERSION } from '../../constants/legalRoutes';
import ZarrelCredit from '../branding/ZarrelCredit';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import { LegalFooterLinks } from './LegalLinks';

/**
 * Elegant legal page footer: © TrabaGE wordmark + ZARREL TECH attribution + support.
 */
export default function LegalBrandFooter() {
  return (
    <footer className="mt-10 border-t border-app-border pt-8">
      <div className="text-center">
        <p className="inline-flex items-baseline gap-1 text-xs font-medium tracking-tight text-app-text">
          <span aria-hidden>©</span>
          <TrabaGEWordmark size="xs" />
          <span aria-hidden>.</span>
        </p>
        <p className="mt-2 text-caption leading-relaxed text-app-muted">
          Diseñado y desarrollado por{' '}
          <a
            href={ZARREL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 transition hover:text-primary-700 hover:decoration-primary-400"
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
            className="text-caption text-app-subtle underline decoration-app-border underline-offset-2 transition hover:text-app-muted "
          >
            {ZARREL_URL.replace(/^https?:\/\//, '')}
          </a>
        </p>
        <p className="mt-4 text-caption text-app-subtle ">
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
