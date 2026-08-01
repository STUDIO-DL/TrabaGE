import { Link } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import AppSidebar from './AppSidebar';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath, isEmployerRole } from '../../constants/roles';

const WIDTH_CLASS = {
  default: 'mx-auto w-full max-w-lg md:max-w-2xl lg:max-w-3xl',
  feed: 'w-full max-w-lg md:max-w-2xl lg:max-w-[40rem] xl:max-w-[42rem]',
  wide: 'mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl',
  full: 'w-full max-w-none',
};

function TabletBrandBar() {
  const { role } = useAuth();
  const home = isEmployerRole(role)
    ? rolePath(role || ROLES.BUSINESS, '/feed')
    : rolePath(ROLES.PERSONAL, '/feed');

  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-app-border bg-app-elevated/95 px-space-md py-space-sm backdrop-blur md:flex lg:hidden">
      <Link to={home} className="inline-flex">
        <TrabaGEWordmark size="md" />
      </Link>
    </header>
  );
}

/**
 * Mobile-first page shell.
 * - &lt; md: compact column + BottomNav
 * - md–lg: wider column + tablet brand bar + BottomNav
 * - lg+: AppSidebar, no BottomNav, optional aside rail
 */
export default function PageContainer({
  children,
  title,
  topBar,
  bottomNav = true,
  backButton = false,
  actions,
  className = '',
  contentClassName = '',
  desktopShell,
  aside = null,
  width = 'default',
}) {
  const useDesktopShell = desktopShell ?? bottomNav;
  const widthClass = WIDTH_CLASS[width] || WIDTH_CLASS.default;
  const hasCustomMax = /\bmax-w-/.test(className);

  const top =
    topBar !== false &&
    (topBar ||
      (backButton || actions || title ? (
        <TopBar title={title} backButton={backButton} actions={actions} />
      ) : null));

  const mainClass = [
    'min-w-0 max-w-full',
    hasCustomMax ? className : `${widthClass}${className ? ` ${className}` : ''}`,
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  if (!useDesktopShell) {
    return (
      <div
        className={[
          bottomNav ? 'page-shell' : 'min-h-dvh min-w-0 max-w-full overflow-x-hidden',
          'mx-auto bg-app-bg text-app-text',
          hasCustomMax ? className : `${widthClass}${className ? ` ${className}` : ''}`,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {top}
        <main className={`min-w-0 max-w-full ${contentClassName || ''}`.trim() || undefined}>
          {children}
        </main>
        {bottomNav ? <BottomNav /> : null}
      </div>
    );
  }

  return (
    <div className="page-shell min-h-dvh min-w-0 max-w-full overflow-x-hidden bg-app-bg text-app-text lg:pb-0">
      <TabletBrandBar />
      {/*
        Do not use min-h-dvh on this inner flex: .page-shell already has
        min-h-dvh + padding-bottom for the fixed BottomNav. A nested min-h-dvh
        forces the shell taller than the viewport and leaves a blank scroll
        gap under the last feed card (web-like, not LinkedIn-like).
      */}
      <div className="flex w-full min-w-0">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          {top}
          {aside ? (
            <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 justify-center gap-space-lg lg:px-space-md xl:px-space-lg">
              <main className={[mainClass, 'mx-auto lg:mx-0'].filter(Boolean).join(' ')}>
                {children}
              </main>
              {aside}
            </div>
          ) : (
            <main className={mainClass || undefined}>{children}</main>
          )}
          {bottomNav ? <BottomNav /> : null}
        </div>
      </div>
    </div>
  );
}
