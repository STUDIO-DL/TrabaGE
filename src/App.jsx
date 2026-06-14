import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import RoleRoute from './components/routing/RoleRoute';
import { ToastContainer } from './components/ui/Toast';
import { useNotificationContext } from './context/NotificationContext';

import SplashScreen from './pages/SplashScreen';
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import AccountTypeSelect from './pages/auth/AccountTypeSelect';
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
import CompanyPublicProfile from './pages/shared/CompanyPublicProfile';
import PrivacyPolicy from './pages/shared/PrivacyPolicy';
import TermsOfUse from './pages/shared/TermsOfUse';
import HelpCenter from './pages/shared/HelpCenter';
import NotFound from './pages/shared/NotFound';

function AppToasts() {
  const { toasts, dismissToast } = useNotificationContext();
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppToasts />
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/account-type" element={<AccountTypeSelect />} />

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
              </Route>

              <Route element={<RoleRoute role="company" />}>
                <Route path="/setup/company" element={<CompanySetup />} />
                <Route path="/company/feed" element={<CompanyFeed />} />
                <Route path="/company/dashboard" element={<Dashboard />} />
                <Route path="/company/publish-job" element={<PublishJob />} />
                <Route path="/company/applicants" element={<Applicants />} />
                <Route path="/company/notifications" element={<CompanyNotifications />} />
                <Route path="/company/profile" element={<CompanyProfile />} />
                <Route path="/company/verification" element={<Verification />} />
              </Route>

              <Route element={<RoleRoute role="admin" />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>

            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/companies/:companyId" element={<CompanyPublicProfile />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfUse />} />
            <Route path="/legal/help" element={<HelpCenter />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
