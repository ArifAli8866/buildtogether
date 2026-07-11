import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context';
import { MainLayout, AuthLayout, DashboardLayout } from '@/layouts';
import { LoadingScreen, ProtectedRoute, ErrorBoundary } from '@/components/ui';

// Lazy loaded pages
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const EditProfilePage = lazy(() => import('@/pages/profile/EditProfilePage'));
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage'));
const CreateProjectPage = lazy(() => import('@/pages/projects/CreateProjectPage'));
const TeamWorkspacePage = lazy(() => import('@/pages/team/TeamWorkspacePage'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const SearchPage = lazy(() => import('@/pages/search/SearchPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/explore" element={<ProjectsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/project/:id" element={<ProjectDetailPage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
          </Route>

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Route>

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/projects/create" element={<CreateProjectPage />} />
            <Route path="/projects/:id/workspace" element={<TeamWorkspacePage />} />
            <Route path="/projects/:id/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:tab" element={<SettingsPage />} />
          </Route>

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
