/**
 * Mobile-first full-viewport layout: Header | scrollable Content | sticky Footer CTA.
 * Keeps primary actions visible without scrolling on supported mobile heights (667px+).
 */
export default function MobileScreenLayout({
  header,
  children,
  footer,
  className = '',
  contentClassName = '',
  footerClassName = '',
  noScroll = false,
  maxWidth = 'max-w-lg',
  bg = 'bg-app-bg',
}) {
  return (
    <div
      className={[
        'mx-auto flex h-dvh max-h-dvh w-full min-h-0 flex-col overflow-hidden',
        maxWidth,
        bg,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {header ? <header className="shrink-0">{header}</header> : null}

      <main
        className={[
          'flex min-h-0 flex-1 flex-col',
          noScroll ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain',
          contentClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>

      {footer ? (
        <footer
          className={[
            'shrink-0 border-t border-app-border bg-app-card px-md pb-md pt-sm',
            footerClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
