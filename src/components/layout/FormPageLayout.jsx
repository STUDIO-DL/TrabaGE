import TopBar from './TopBar';
import BottomNav from './BottomNav';
import KeyboardAwareFooter from './KeyboardAwareFooter';
import { useKeyboard } from '../../hooks/useKeyboard';

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
  const showTopBar = title || backButton || actions;
  const { keyboardOffset } = useKeyboard();

  return (
    <div
      className={[
        'mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden bg-app-bg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ paddingTop: showTopBar ? undefined : 'env(safe-area-inset-top, 0px)' }}
    >
      {showTopBar ? (
        <TopBar title={title} backButton={backButton} actions={actions} />
      ) : null}

      <main
        className={['min-h-0 flex-1 overflow-y-auto overscroll-contain', contentClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>

      {footer ? (
        <KeyboardAwareFooter className="border-t border-app-border bg-app-card p-space-base">
          {footer}
        </KeyboardAwareFooter>
      ) : null}

      {bottomNav ? (
        <div
          className="shrink-0"
          style={{
            paddingBottom: `calc(4.5rem + env(safe-area-inset-bottom, 0px) + ${keyboardOffset}px)`,
          }}
          aria-hidden
        />
      ) : null}
      {bottomNav ? <BottomNav /> : null}
    </div>
  );
}
