import { Link } from 'react-router-dom';
import BottomNav from '../../layout/BottomNav';
import CompanyDashboardSidebar from './CompanyDashboardSidebar';
import TrabaGEWordmark from '../../branding/TrabaGEWordmark';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';

function TabletTopBar() {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;

  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-app-border bg-white px-space-md py-space-sm md:flex lg:hidden dark:bg-app-card">
      <Link to={rolePath(base, '/dashboard')} className="inline-flex">
        <TrabaGEWordmark size="md" />
      </Link>
    </header>
  );
}

export default function CompanyDashboardShell({ profile, children }) {
  return (
    <div className="page-shell min-w-0 max-w-full overflow-x-hidden bg-app-surface lg:pb-0">
      <TabletTopBar />
      <div className="flex w-full min-w-0">
        <CompanyDashboardSidebar profile={profile} />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
