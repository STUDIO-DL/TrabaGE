import BottomNav from './BottomNav';
import TopBar from './TopBar';

export default function PageContainer({
  children,
  title,
  topBar,
  bottomNav = true,
  backButton = false,
  actions,
  className = '',
  contentClassName = '',
}) {
  const shellClass = [
    bottomNav ? 'page-shell' : 'min-h-dvh min-w-0 max-w-full overflow-x-hidden',
    'mx-auto max-w-lg bg-app-bg text-app-text',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      {topBar !== false &&
        (topBar ||
          (backButton || actions || title ? (
            <TopBar title={title} backButton={backButton} actions={actions} />
          ) : null))}
      <main className={`min-w-0 max-w-full ${contentClassName || ''}`.trim() || undefined}>{children}</main>
      {bottomNav && <BottomNav />}
    </div>
  );
}
