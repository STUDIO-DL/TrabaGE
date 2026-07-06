import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import RoleRoute from './components/routing/RoleRoute';
import GuestBar from './components/common/GuestBar';
import InstallPrompt from './components/common/InstallPrompt';
import { ToastContainer } from './components/ui/Toast';
import { useNotificationContext } from './context/NotificationContext';

const SplashScreen = lazy(() => import('./pages/SplashScreen'));
const OnboardingFlow = lazy(() => import('./pages/onboarding/OnboardingFlow'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const Login = lazy(() => import('./pages/auth/Login'));
const Explore = lazy(() => import('./pages/auth/Explore'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const SetPassword = lazy(() => import('./pages/auth/SetPassword'));
const CandidateSetup = lazy(() => import('./pages/setup/CandidateSetup'));
const CompanySetup = lazy(() => import('./pages/setup/CompanySetup'));

const CandidateFeed = lazy(() => import('./pages/candidate/Feed'));
const CandidateJobs = lazy(() => import('./pages/candidate/Jobs'));
const CandidatePublish = lazy(() => import('./pages/candidate/Publish'));
const JobDetail = lazy(() => import('./pages/candidate/JobDetail'));
const ApplyJob = lazy(() => import('./pages/candidate/ApplyJob'));
const CandidateApplications = lazy(() => import('./pages/candidate/Applications'));
const CandidateNotifications = lazy(() => import('./pages/candidate/Notifications'));
const CandidateProfile = lazy(() => import('./pages/candidate/Profile'));
const CandidateSavedJobs = lazy(() => import('./pages/candidate/SavedJobs'));
const CandidateSettings = lazy(() => import('./pages/candidate/Settings'));
const CandidateAppearance = lazy(() => import('./pages/candidate/Appearance'));
const CandidateNotificationSettings = lazy(() => import('./pages/candidate/NotificationSettings'));
const PublicProfile = lazy(() => import('./pages/candidate/PublicProfile'));

const CompanyFeed = lazy(() => import('./pages/company/Feed'));
const Dashboard = lazy(() => import('./pages/company/Dashboard'));
const PublishJob = lazy(() => import('./pages/company/PublishJob'));
const CompanyJobs = lazy(() => import('./pages/company/Jobs'));
const Applicants = lazy(() => import('./pages/company/Applicants'));
const CompanyNotifications = lazy(() => import('./pages/company/Notifications'));
const CompanyProfile = lazy(() => import('./pages/company/Profile'));
const CompanySettings = lazy(() => import('./pages/company/Settings'));
const CompanyAppearance = lazy(() => import('./pages/company/Appearance'));
const CompanyNotificationSettings = lazy(() => import('./pages/company/NotificationSettings'));
const Verification = lazy(() => import('./pages/company/Verification'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCompanies = lazy(() => import('./pages/admin/AdminCompanies'));
const AdminVerifications = lazy(() => import('./pages/admin/AdminVerifications'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminPosts = lazy(() => import('./pages/admin/AdminPosts'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const CompanyPublicProfile = lazy(() => import('./pages/shared/CompanyPublicProfile'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const DemoCompanyEntry = lazy(() => import('./pages/demo/DemoCompanyEntry'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PrivacyPolicy = lazy(() => import('./pages/shared/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/shared/TermsOfUse'));
const NotFound = lazy(() => import('./pages/shared/NotFound'));

function AppToasts() {
  const { toasts, dismissToast } = useNotificationContext();
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

function AppRoutes() {
  return (
    <>
      <GuestBar />
      <InstallPrompt />
      <Suspense fallback={null}>
        <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/account-type" element={<Navigate to="/register" replace />} />
            <Route path="/register-method" element={<Navigate to="/register" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/demo/company" element={<DemoCompanyEntry />} />
            <Route path="/jobs/:id" element={<JobDetail />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/auth/set-password" element={<SetPassword />} />
              <Route path="/search" element={<SearchResults />} />

              <Route element={<RoleRoute role="candidate" />}>
                <Route path="/setup/candidate" element={<CandidateSetup />} />
                <Route path="/candidate/feed" element={<CandidateFeed />} />
                <Route path="/candidate/jobs" element={<CandidateJobs />} />
                <Route path="/candidate/publish" element={<CandidatePublish />} />
                <Route path="/candidate/jobs/:id/apply" element={<ApplyJob />} />
                <Route path="/candidate/saved-jobs" element={<CandidateSavedJobs />} />
                <Route path="/candidate/applications" element={<CandidateApplications />} />
                <Route path="/candidate/notifications" element={<CandidateNotifications />} />
                <Route path="/candidate/profile" element={<CandidateProfile />} />
                <Route path="/candidate/settings" element={<CandidateSettings />} />
                <Route path="/candidate/settings/appearance" element={<CandidateAppearance />} />
                <Route path="/candidate/settings/notifications" element={<CandidateNotificationSettings />} />
                <Route path="/help" element={<HelpCenter />} />
              </Route>

              <Route element={<RoleRoute role="company" />}>
                <Route path="/setup/company" element={<CompanySetup />} />
                <Route path="/company/feed" element={<CompanyFeed />} />
                <Route path="/company/dashboard" element={<Dashboard />} />
                <Route path="/company/jobs" element={<CompanyJobs />} />
                <Route path="/company/jobs/create" element={<PublishJob />} />
                <Route path="/company/jobs/:jobId/edit" element={<PublishJob />} />
                <Route path="/company/publish-job" element={<Navigate to="/company/jobs/create" replace />} />
                <Route path="/company/applicants" element={<Applicants />} />
                <Route path="/company/notifications" element={<CompanyNotifications />} />
                <Route path="/company/profile" element={<CompanyProfile />} />
                <Route path="/company/settings" element={<CompanySettings />} />
                <Route path="/company/settings/appearance" element={<CompanyAppearance />} />
                <Route path="/company/settings/notifications" element={<CompanyNotificationSettings />} />
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
                  <Route path="/admin/help" element={<HelpCenter />} />
                </Route>
              </Route>
            </Route>

            {/* Public deep-link entry points (clean shareable URLs). See src/utils/deepLinks.js */}
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/company/:companyId" element={<CompanyPublicProfile />} />
            <Route path="/companies/:companyId" element={<CompanyPublicProfile />} />
            <Route path="/job/:id" element={<JobDetail />} />
            {/* Legacy share paths kept public for backward compatibility with links
                shared before the clean deep-link URLs (see src/utils/deepLinks.js). */}
            <Route path="/candidate/jobs/:id" element={<JobDetail />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            <Route path="/feed/post/:postId" element={<PostDetail />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/legal/privacy" element={<Navigate to="/privacy" replace />} />
            <Route path="/legal/terms" element={<Navigate to="/terms" replace />} />
            <Route path="/legal/help" element={<HelpCenter />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AppToasts />
            <AppRoutes />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
