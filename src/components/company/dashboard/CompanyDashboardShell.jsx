import BottomNav from '../../layout/BottomNav';
import PreviewBanner from '../../common/PreviewBanner';
import CompanyDashboardSidebar from './CompanyDashboardSidebar';

export default function CompanyDashboardShell({ profile, children }) {
  return (
    <div className="page-shell min-h-dvh bg-[#F9FAFB] pb-20 lg:pb-0">
      <PreviewBanner />
      <div className="flex min-h-dvh w-full">
        <CompanyDashboardSidebar profile={profile} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
