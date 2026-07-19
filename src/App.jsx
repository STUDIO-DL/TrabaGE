import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { KeyboardProvider } from './context/KeyboardContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import GuestOnlyRoute from './components/routing/GuestOnlyRoute';
import RoleRoute from './components/routing/RoleRoute';
import { RouteSectionLayout } from './components/routing/RouteErrorBoundary';
import GuestBar from './components/common/GuestBar';
import InstallPrompt from './components/common/InstallPrompt';
import PushPermissionPrompt from './components/common/PushPermissionPrompt';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt';
import { ToastContainer } from './components/ui/Toast';
import { useNotificationContext } from './context/NotificationContext';
import AuthLoadingScreen from './components/auth/AuthLoadingScreen';
import { ROLES } from './constants/roles';

const SplashScreen = lazy(() => import('./pages/SplashScreen'));
const OnboardingFlow = lazy(() => import('./pages/onboarding/OnboardingFlow'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const AuthConfirm = lazy(() => import('./pages/auth/AuthConfirm'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
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
const EditIntro = lazy(() => import('./pages/candidate/EditIntro'));
const CandidateSavedJobs = lazy(() => import('./pages/candidate/SavedJobs'));
const CandidateSettings = lazy(() => import('./pages/candidate/Settings'));
const CandidateAppearance = lazy(() => import('./pages/candidate/Appearance'));
const CandidateNotificationSettings = lazy(() => import('./pages/candidate/NotificationSettings'));
const PublicProfile = lazy(() => import('./pages/candidate/PublicProfile'));

const CompanyFeed = lazy(() => import('./pages/company/Feed'));
const CompanyPublish = lazy(() => import('./pages/company/Publish'));
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
const AdminOrganizations = lazy(() => import('./pages/admin/AdminOrganizations'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const CompanyPublicProfile = lazy(() => import('./pages/shared/CompanyPublicProfile'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const DemoCompanyEntry = lazy(() => import('./pages/demo/DemoCompanyEntry'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PrivacyPolicy = lazy(() => import('./pages/shared/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/shared/TermsOfUse'));
const About = lazy(() => import('./pages/shared/About'));
const AppInfo = lazy(() => import('./pages/shared/AppInfo'));
const Maintenance = lazy(() => import('./pages/shared/Maintenance'));
const NotFound = lazy(() => import('./pages/shared/NotFound'));

function AppToasts() {
  const { toasts, dismissToast } = useNotificationContext();
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

function LegacyPathRedirect({ toPrefix }) {
  const { '*': rest } = useParams();
  const location = useLocation();
  const suffix = rest ? `/${rest}` : '';
  return <Navigate to={`${toPrefix}${suffix}${location.search}${location.hash}`} replace />;
}

function EmployerPublishJobRedirect() {
  const { pathname } = useLocation();
  const base = pathname.startsWith('/organization') ? '/organization' : '/business';
  return <Navigate to={`${base}/publish`} replace />;
}

function LegacyCompanyJobEditRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/business/jobs/${jobId}/edit`} replace />;
}

/** Shared employer app routes under /business/* and /organization/*. */
function EmployerAppRoutes() {
  return (
    <>
      <Route path="feed" element={<CompanyFeed />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="publish" element={<CompanyPublish />} />
      <Route path="jobs" element={<CompanyJobs />} />
      <Route path="jobs/create" element={<PublishJob />} />
      <Route path="jobs/:jobId/edit" element={<PublishJob />} />
      <Route path="publish-job" element={<EmployerPublishJobRedirect />} />
      <Route path="applicants" element={<Applicants />} />
      <Route path="notifications" element={<CompanyNotifications />} />
      <Route path="profile" element={<CompanyProfile />} />
      <Route path="settings" element={<CompanySettings />} />
      <Route path="settings/appearance" element={<CompanyAppearance />} />
      <Route path="settings/notifications" element={<CompanyNotificationSettings />} />
      <Route path="verification" element={<Verification />} />
      <Route path="help" element={<HelpCenter />} />
    </>
  );
}

function AppRoutes() {
  return (
    <>
      <GuestBar />
      <PwaUpdatePrompt />
      <InstallPrompt />
      <PushPermissionPrompt />
      <Suspense fallback={<AuthLoadingScreen />}>
        <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />

            <Route element={<RouteSectionLayout />}>
              <Route element={<GuestOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
              </Route>
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/auth/verify-email" element={<Navigate to="/verify-email" replace />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/account-type" element={<Navigate to="/register" replace />} />
              <Route path="/register-method" element={<Navigate to="/register" replace />} />
              <Route path="/demo/company" element={<DemoCompanyEntry />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/auth/set-password" element={<SetPassword />} />
              <Route path="/search" element={<SearchResults />} />

              <Route element={<RoleRoute role={ROLES.PERSONAL} />}>
                <Route element={<RouteSectionLayout />}>
                  <Route path="/setup/personal" element={<CandidateSetup />} />
                  <Route path="/personal/feed" element={<CandidateFeed />} />
                  <Route path="/personal/jobs" element={<CandidateJobs />} />
                  <Route path="/personal/publish" element={<CandidatePublish />} />
                  <Route path="/personal/jobs/:id/apply" element={<ApplyJob />} />
                  <Route path="/personal/saved-jobs" element={<CandidateSavedJobs />} />
                  <Route path="/personal/applications" element={<CandidateApplications />} />
                  <Route path="/personal/notifications" element={<CandidateNotifications />} />
                  <Route path="/personal/profile" element={<CandidateProfile />} />
                  <Route path="/personal/profile/edit-intro" element={<EditIntro />} />
                  <Route path="/personal/settings" element={<CandidateSettings />} />
                  <Route path="/personal/settings/appearance" element={<CandidateAppearance />} />
                  <Route path="/personal/settings/notifications" element={<CandidateNotificationSettings />} />
                  <Route path="/help" element={<HelpCenter />} />
                </Route>
              </Route>

              <Route element={<RoleRoute roles={[ROLES.BUSINESS, ROLES.ORGANIZATION]} />}>
                <Route element={<RouteSectionLayout />}>
                  <Route path="/setup/business" element={<CompanySetup />} />
                  <Route path="/setup/organization" element={<CompanySetup />} />
                  <Route path="/business">{EmployerAppRoutes()}</Route>
                  <Route path="/organization">{EmployerAppRoutes()}</Route>
                </Route>
              </Route>

              <Route element={<RoleRoute role={ROLES.ADMIN} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/companies" element={<AdminCompanies />} />
                  <Route path="/admin/organizations" element={<AdminOrganizations />} />
                  <Route path="/admin/verifications" element={<AdminVerifications />} />
                  <Route path="/admin/jobs" element={<AdminJobs />} />
                  <Route path="/admin/posts" element={<AdminPosts />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/notifications" element={<AdminNotifications />} />
                  <Route path="/admin/profile" element={<AdminProfile />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/help" element={<HelpCenter />} />
                </Route>
              </Route>
            </Route>

            {/* Legacy path redirects — explicit company app paths before /company/:companyId */}
            <Route path="/setup/candidate" element={<Navigate to="/setup/personal" replace />} />
            <Route path="/setup/company" element={<Navigate to="/setup/business" replace />} />
            <Route path="/candidate/jobs/:id" element={<JobDetail />} />
            <Route path="/candidate/*" element={<LegacyPathRedirect toPrefix="/personal" />} />
            <Route path="/company/feed" element={<Navigate to="/business/feed" replace />} />
            <Route path="/company/dashboard" element={<Navigate to="/business/dashboard" replace />} />
            <Route path="/company/jobs/create" element={<Navigate to="/business/jobs/create" replace />} />
            <Route
              path="/company/jobs/:jobId/edit"
              element={<LegacyCompanyJobEditRedirect />}
            />
            <Route path="/company/jobs" element={<Navigate to="/business/jobs" replace />} />
            <Route path="/company/publish-job" element={<Navigate to="/business/publish" replace />} />
            <Route path="/company/applicants" element={<Navigate to="/business/applicants" replace />} />
            <Route path="/company/notifications" element={<Navigate to="/business/notifications" replace />} />
            <Route path="/company/profile" element={<Navigate to="/business/profile" replace />} />
            <Route path="/company/settings/appearance" element={<Navigate to="/business/settings/appearance" replace />} />
            <Route path="/company/settings/notifications" element={<Navigate to="/business/settings/notifications" replace />} />
            <Route path="/company/settings" element={<Navigate to="/business/settings" replace />} />
            <Route path="/company/verification" element={<Navigate to="/business/verification" replace />} />
            <Route path="/company/help" element={<Navigate to="/business/help" replace />} />

            {/* Public deep-link entry points (clean shareable URLs). See src/utils/deepLinks.js */}
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/company/:companyId" element={<CompanyPublicProfile />} />
            <Route path="/companies/:companyId" element={<CompanyPublicProfile />} />
            <Route path="/job/:id" element={<JobDetail />} />
            <Route path="/personal/jobs/:id" element={<JobDetail />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            <Route path="/feed/post/:postId" element={<PostDetail />} />

            <Route element={<RouteSectionLayout />}>
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/aviso-legal" element={<Navigate to="/terms#marcas-terceros-uso" replace />} />
              <Route path="/about" element={<About />} />
              <Route path="/app-info" element={<AppInfo />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/legal/privacy" element={<Navigate to="/privacy" replace />} />
              <Route path="/legal/terms" element={<Navigate to="/terms" replace />} />
              <Route path="/legal/aviso-legal" element={<Navigate to="/terms#marcas-terceros-uso" replace />} />
              <Route path="/legal/help" element={<HelpCenter />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ThemeProvider>
            <KeyboardProvider>
              <NotificationProvider>
                <AppToasts />
                <AppRoutes />
              </NotificationProvider>
            </KeyboardProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
