import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_DATE, LEGAL_VERSION } from '../../constants/legalRoutes';
import { LegalArticle, LegalTableOfContents } from './LegalContent';
import LegalBrandFooter from './LegalBrandFooter';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';

export default function LegalDocumentLayout({
  pageTitle,
  intro,
  articles,
  finalArticles = [],
  finalPartTitle = null,
  relatedLink,
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, []);

  return (
    <div className="min-h-dvh bg-app-bg">
      <header className="sticky top-0 z-40 border-b border-app-border bg-app-elevated/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-space-sm px-space-md py-space-sm sm:px-space-lg">
          <Link
            to="/login"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md text-app-muted transition-colors hover:bg-app-surface hover:text-app-text"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-small font-semibold text-app-text">{intro.title}</p>
            <p className="flex items-center gap-1 truncate text-caption text-app-subtle">
              <TrabaGEWordmark size="xs" />
              <span>· v{LEGAL_VERSION}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-space-md py-space-lg sm:px-space-lg sm:py-space-xl">
        <div className="mb-space-lg border-b border-app-divider pb-space-md">
          {intro.part ? (
            <p className="text-caption font-semibold uppercase tracking-wider text-primary-600">
              {intro.part}
            </p>
          ) : null}
          <h1 className="text-title font-semibold tracking-tight text-app-text">{pageTitle}</h1>
          <p className="mt-space-sm max-w-2xl text-body-small leading-relaxed text-app-muted">
            {intro.subtitle}
          </p>
          <div className="mt-space-sm flex flex-wrap gap-x-space-md gap-y-1 text-caption text-app-subtle">
            <span>Versión {LEGAL_VERSION}</span>
            <span aria-hidden>·</span>
            <span>{LEGAL_DATE}</span>
          </div>
          {relatedLink ? (
            <p className="mt-space-sm text-caption text-app-muted">
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

        <div className="mb-space-lg">
          <LegalTableOfContents articles={articles} finalArticles={finalArticles} />
        </div>

        <article className="legal-document">
          {articles.map((article) => (
            <LegalArticle key={article.id} article={article} />
          ))}

          {finalArticles.length > 0 ? (
            <>
              {finalPartTitle ? (
                <div className="border-b border-app-divider py-space-md">
                  <h2 className="text-body font-semibold text-app-text">{finalPartTitle}</h2>
                </div>
              ) : null}
              {finalArticles.map((article) => (
                <LegalArticle key={article.id} article={article} />
              ))}
            </>
          ) : null}
        </article>

        <LegalBrandFooter />
      </div>
    </div>
  );
}
