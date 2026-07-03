import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import RoleRoute from './components/routing/RoleRoute';
import GuestBar from './components/common/GuestBar';
import InstallPrompt from './components/common/InstallPrompt';
import { ToastContainer } from './components/ui/Toast';
import { useNotificationContext } from './context/NotificationContext';

import SplashScreen from './pages/SplashScreen';
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import AuthCallback from './pages/auth/AuthCallback';
import Login from './pages/auth/Login';
import Explore from './pages/auth/Explore';
import Register from './pages/auth/Register';
import RegisterMethod from './pages/auth/RegisterMethod';
import ForgotPassword from './pages/auth/ForgotPassword';
import AccountTypeSelect from './pages/auth/AccountTypeSelect';
import SetPassword from './pages/auth/SetPassword';
import CandidateSetup from './pages/setup/CandidateSetup';
import CompanySetup from './pages/setup/CompanySetup';

import CandidateFeed from './pages/candidate/Feed';
import CandidateJobs from './pages/candidate/Jobs';
import CandidatePublish from './pages/candidate/Publish';
import JobDetail from './pages/candidate/JobDetail';
import ApplyJob from './pages/candidate/ApplyJob';
import CandidateApplications from './pages/candidate/Applications';
import CandidateNotifications from './pages/candidate/Notifications';
import CandidateProfile from './pages/candidate/Profile';
import PublicProfile from './pages/candidate/PublicProfile';

import CompanyFeed from './pages/company/Feed';
import Dashboard from './pages/company/Dashboard';
import PublishJob from './pages/company/PublishJob';
import Applicants from './pages/company/Applicants';
import CompanyNotifications from './pages/company/Notifications';
import CompanyProfile from './pages/company/Profile';
import Verification from './pages/company/Verification';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminJobs from './pages/admin/AdminJobs';
import AdminPosts from './pages/admin/AdminPosts';
import AdminReports from './pages/admin/AdminReports';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLayout from './components/admin/AdminLayout';
import CompanyPublicProfile from './pages/shared/CompanyPublicProfile';
import DemoCompanyEntry from './pages/demo/DemoCompanyEntry';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/shared/PrivacyPolicy';
import TermsOfUse from './pages/shared/TermsOfUse';
import NotFound from './pages/shared/NotFound';

function AppToasts() {
  const { toasts, dismissToast } = useNotificationContext();
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

function AppRoutes() {
  return (
    <>
      <GuestBar />
      <InstallPrompt />
      <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/account-type" element={<AccountTypeSelect />} />
            <Route path="/register-method" element={<RegisterMethod />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/demo/company" element={<DemoCompanyEntry />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/auth/set-password" element={<SetPassword />} />

              <Route element={<RoleRoute role="candidate" />}>
                <Route path="/setup/candidate" element={<CandidateSetup />} />
                <Route path="/candidate/feed" element={<CandidateFeed />} />
                <Route path="/candidate/jobs" element={<CandidateJobs />} />
                <Route path="/candidate/publish" element={<CandidatePublish />} />
                <Route path="/candidate/jobs/:id" element={<JobDetail />} />
                <Route path="/candidate/jobs/:id/apply" element={<ApplyJob />} />
                <Route path="/candidate/applications" element={<CandidateApplications />} />
                <Route path="/candidate/notifications" element={<CandidateNotifications />} />
                <Route path="/candidate/profile" element={<CandidateProfile />} />
                <Route path="/help" element={<HelpCenter />} />
              </Route>

              <Route element={<RoleRoute role="company" />}>
                <Route path="/setup/company" element={<CompanySetup />} />
                <Route path="/company/feed" element={<CompanyFeed />} />
                <Route path="/company/dashboard" element={<Dashboard />} />
                <Route path="/company/jobs/create" element={<PublishJob />} />
                <Route path="/company/publish-job" element={<Navigate to="/company/jobs/create" replace />} />
                <Route path="/company/applicants" element={<Applicants />} />
                <Route path="/company/notifications" element={<CompanyNotifications />} />
                <Route path="/company/profile" element={<CompanyProfile />} />
                <Route path="/company/verification" element={<Verification />} />
                <Route path="/company/help" element={<HelpCenter />} />
              </Route>

              <Route element={<RoleRoute role="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/companies" element={<AdminCompanies />} />
                  <Route path="/admin/verifications" element={<AdminVerifications />} />
                  <Route path="/admin/jobs" element={<AdminJobs />} />
                  <Route path="/admin/posts" element={<AdminPosts />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/notifications" element={<AdminNotifications />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                </Route>
                <Route path="/admin/help" element={<HelpCenter />} />
              </Route>
            </Route>

            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/companies/:companyId" element={<CompanyPublicProfile />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/legal/privacy" element={<Navigate to="/privacy" replace />} />
            <Route path="/legal/terms" element={<Navigate to="/terms" replace />} />
            <Route path="/legal/help" element={<HelpCenter />} />
            <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppToasts />
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
