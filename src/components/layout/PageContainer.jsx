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
  return (
    <div className={`page-shell mx-auto max-w-lg bg-app-bg text-app-text ${className}`}>
      {topBar !== false &&
        (topBar || (title && <TopBar title={title} backButton={backButton} actions={actions} />))}
      <main className={contentClassName || undefined}>{children}</main>
      {bottomNav && <BottomNav />}
    </div>
  );
}
