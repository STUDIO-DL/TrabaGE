import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_DATE, LEGAL_SUPPORT_EMAIL, LEGAL_VERSION } from '../../constants/legalRoutes';
import { LegalArticle, LegalTableOfContents } from './LegalContent';
import { LegalFooterLinks } from './LegalLinks';

export default function LegalDocumentLayout({
  pageTitle,
  intro,
  articles,
  finalArticles = [],
  finalPartTitle = 'Parte C — Disposiciones Finales',
  relatedLink,
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, []);

  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/login"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{intro.title}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">TrabaGE · v{LEGAL_VERSION}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 border-b border-slate-100 pb-8 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            {intro.part}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
            {pageTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {intro.subtitle}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Versión {LEGAL_VERSION}</span>
            <span aria-hidden>·</span>
            <span>{LEGAL_DATE}</span>
            <span aria-hidden>·</span>
            <span>Web App · PWA · Móvil</span>
          </div>
          {relatedLink ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Consulta también:{' '}
              <Link
                to={relatedLink.to}
                className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 hover:text-primary-700"
              >
                {relatedLink.label}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="mb-10">
          <LegalTableOfContents articles={articles} finalArticles={finalArticles} />
        </div>

        <article className="legal-document">
          {articles.map((article) => (
            <LegalArticle key={article.id} article={article} />
          ))}

          {finalArticles.length > 0 ? (
            <>
              <div className="border-b border-slate-100 py-8 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{finalPartTitle}</h2>
              </div>
              {finalArticles.map((article) => (
                <LegalArticle key={article.id} article={article} />
              ))}
            </>
          ) : null}
        </article>

        <footer className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            TrabaGE © 2026 — Todos los derechos reservados
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <a
              href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              {LEGAL_SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Versión {LEGAL_VERSION} — {LEGAL_DATE}
          </p>
          <div className="mt-6">
            <LegalFooterLinks />
          </div>
        </footer>
      </div>
    </div>
  );
}
