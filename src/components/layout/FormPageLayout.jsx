import TopBar from './TopBar';
import BottomNav from './BottomNav';

/**
 * App form pages with scrollable body and sticky footer CTA (Save, Apply, Publish, etc.).
 */
export default function FormPageLayout({
  title,
  backButton = false,
  actions,
  bottomNav = false,
  children,
  footer,
  className = '',
  contentClassName = '',
}) {
  return (
    <div
      className={[
        'mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden bg-app-bg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {title ? <TopBar title={title} backButton={backButton} actions={actions} /> : null}

      <main
        className={['min-h-0 flex-1 overflow-y-auto overscroll-contain', contentClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>

      {footer ? (
        <footer
          className="shrink-0 border-t border-app-border bg-app-card p-space-base"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {footer}
        </footer>
      ) : null}

      {bottomNav ? (
        <div className="shrink-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]" aria-hidden />
      ) : null}
      {bottomNav ? <BottomNav /> : null}
    </div>
  );
}
