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
}) {
  return (
    <div className={`page-shell mx-auto max-w-lg ${className}`}>
      {topBar !== false && (topBar || (title && <TopBar title={title} backButton={backButton} actions={actions} />))}
      <main>{children}</main>
      {bottomNav && <BottomNav />}
    </div>
  );
}
