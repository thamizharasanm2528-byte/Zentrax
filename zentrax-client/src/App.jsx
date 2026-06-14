import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { Loader2, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from './apiConfig';
import ErrorBoundary from './components/ErrorBoundary';

// Retry wrapper for lazy imports — handles stale chunks after Netlify redeploys
const lazyRetry = (importFn) => lazy(() =>
    importFn().catch(() => {
        const reloadKey = 'zentrax-chunk-reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 30000) {
            sessionStorage.setItem(reloadKey, String(now));
            window.location.reload();
        }
        // Return a fallback so React doesn't crash while reloading
        return { default: () => null };
    })
);

// Lazy-loaded pages
const Login = lazyRetry(() => import('./pages/Auth/Login'));
const Signup = lazyRetry(() => import('./pages/Auth/Signup'));
const StudentDashboard = lazyRetry(() => import('./pages/Dashboard/StudentDashboard'));
const MentorDashboard = lazyRetry(() => import('./pages/Dashboard/MentorDashboard'));
const Dashboard = lazyRetry(() => import('./pages/Dashboard/Dashboard'));
const CreateProject = lazyRetry(() => import('./pages/Workspace/CreateProject'));
const ProjectRoom = lazyRetry(() => import('./pages/Workspace/ProjectRoom'));
const MentorProjectView = lazyRetry(() => import('./pages/Workspace/MentorProjectView'));
const SubmitDoubt = lazyRetry(() => import('./pages/Mentorship/SubmitDoubt'));
const MentoringDoubts = lazyRetry(() => import('./pages/Mentorship/MentoringDoubts'));
const AssignedTeams = lazyRetry(() => import('./pages/Mentorship/AssignedTeams'));
const RequestMentor = lazyRetry(() => import('./pages/Mentorship/RequestMentor'));
// MentorChat merged into MessagesHub
const RequestSession = lazyRetry(() => import('./pages/Mentorship/RequestSession'));
const LiveSession = lazyRetry(() => import('./pages/Mentorship/LiveSession'));
const FindTeam = lazyRetry(() => import('./pages/Dashboard/FindTeam'));
const JoinTeam = lazyRetry(() => import('./pages/Dashboard/JoinTeam'));
const AIAssistant = lazyRetry(() => import('./pages/AI/AIAssistant'));
const Notifications = lazyRetry(() => import('./pages/Notifications/Notifications'));
const Settings = lazyRetry(() => import('./pages/Settings/Settings'));
const MyProjects = lazyRetry(() => import('./pages/Projects/MyProjects'));
const MentorshipHub = lazyRetry(() => import('./pages/Mentorship/MentorshipHub'));
const ChatPageV2 = lazyRetry(() => import('./pages/Mentorship/ChatPage'));
const DirectMessages = lazyRetry(() => import('./pages/Messages/DirectMessages'));
const StudentAnalytics = lazyRetry(() => import('./pages/Dashboard/StudentAnalytics'));
const MentorAnalytics = lazyRetry(() => import('./pages/Dashboard/MentorAnalytics'));
// ProjectShowcase merged into MyProjects

// Onboarding
const StudentOnboarding = lazy(() => import('./pages/Onboarding/StudentOnboarding'));
const MentorOnboarding = lazy(() => import('./pages/Onboarding/MentorOnboarding'));

// Landing
const Landing = lazy(() => import('./pages/Landing/Landing'));

// Help
const Help = lazy(() => import('./pages/Help/Help'));

// Admin pages
const AdminOverview = lazy(() => import('./pages/Admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'));
const AdminProjects = lazy(() => import('./pages/Admin/AdminProjects'));
const AdminMentorship = lazy(() => import('./pages/Admin/AdminMentorship'));
const AdminReports = lazy(() => import('./pages/Admin/AdminReports'));
const AdminLogs = lazy(() => import('./pages/Admin/AdminLogs'));
const AdminSystemHealth = lazy(() => import('./pages/Admin/AdminSystemHealth'));
const AdminMentorInvites = lazy(() => import('./pages/Admin/AdminMentorInvites'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#030712' }}>
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,224,138,0.1)' }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#00E08A' }} />
      </div>
      <p className="text-xs font-medium text-[#94A3B8] animate-pulse">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

// Auth-only guard (no Layout wrapper — for full-screen pages like LiveSession)
const AuthOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const RoleRoute = ({ children, role }) => {
  const { userData, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  
  if (!userData) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#030712' }}>
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#00E08A' }} />
      <p className="text-xs text-[#94A3B8] animate-pulse">Synchronizing profile...</p>
    </div>
  );

  // If role is missing from profile, we have a data integrity issue
  if (!userData.role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#030712' }}>
        <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
          <ShieldAlert className="h-7 w-7 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-white">Profile Incomplete</h3>
        <p className="text-sm text-[#94A3B8] mt-2 max-w-xs">We couldn't determine your account role. Please try logging out and back in.</p>
        <button onClick={() => window.location.href = '/login'} className="zen-btn-primary mt-6">Back to Login</button>
      </div>
    );
  }

  // Onboarding gate: redirect to onboarding if profile not completed
  // Skip if already on onboarding pages to avoid loops
  const currentPath = window.location.pathname;
  const isOnboardingPage = currentPath.startsWith('/onboarding');
  if (userData.profileCompleted === false && !isOnboardingPage) {
    const onboardingPath = userData.role === 'mentor' ? '/onboarding/mentor' : '/onboarding/student';
    return <Navigate to={onboardingPath} replace />;
  }

  // Prevent redirect loop: only redirect if we are NOT where we should be
  if (userData.role !== role) {
    const destination = userData.role === 'mentor' ? '/mentor-dashboard' : '/student-dashboard';
    // If the current path is already the destination, don't redirect (avoids loop)
    if (window.location.pathname === destination) return children;
    return <Navigate to={destination} replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    const check = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/admin/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setIsAdmin(data.success && data.isAdmin);
        if (!data.isAdmin) {
          // Non-admin tried to access /admin — handled by redirect
        }
      } catch {
        setIsAdmin(false);
      }
      setChecking(false);
    };
    check();
  }, [user, loading]);

  if (loading || checking) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

// Role-based project view — shows MentorProjectView for mentors, ProjectRoom for students
const RoleProjectView = () => {
  const { userData } = useAuth();
  if (userData?.role === 'mentor') return <MentorProjectView />;
  return <ProjectRoom />;
};

function App() {
  return (
    <Router>
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/student-dashboard" element={<ProtectedRoute><RoleRoute role="student"><StudentDashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/mentor-dashboard" element={<ProtectedRoute><RoleRoute role="mentor"><MentorDashboard /></RoleRoute></ProtectedRoute>} />

            {/* Projects */}
            <Route path="/projects/create" element={<ProtectedRoute><RoleRoute role="student"><CreateProject /></RoleRoute></ProtectedRoute>} />
            <Route path="/projects/my" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><RoleProjectView /></ProtectedRoute>} />

            {/* Collaboration */}
            <Route path="/find-team" element={<ProtectedRoute><FindTeam /></ProtectedRoute>} />
            <Route path="/join-team" element={<ProtectedRoute><RoleRoute role="student"><JoinTeam /></RoleRoute></ProtectedRoute>} />

            {/* Mentorship */}
            <Route path="/mentorship/doubts" element={<ProtectedRoute><RoleRoute role="student"><SubmitDoubt /></RoleRoute></ProtectedRoute>} />
            <Route path="/request-mentor" element={<ProtectedRoute><RoleRoute role="student"><RequestMentor /></RoleRoute></ProtectedRoute>} />
            <Route path="/mentor/doubts" element={<ProtectedRoute><RoleRoute role="mentor"><MentoringDoubts /></RoleRoute></ProtectedRoute>} />
            <Route path="/mentor/teams" element={<ProtectedRoute><RoleRoute role="mentor"><AssignedTeams /></RoleRoute></ProtectedRoute>} />
            <Route path="/mentor-messages" element={<ProtectedRoute><ChatPageV2 /></ProtectedRoute>} />
            <Route path="/mentorship/hub" element={<ProtectedRoute><MentorshipHub /></ProtectedRoute>} />
            <Route path="/mentorship/request-session" element={<ProtectedRoute><RoleRoute role="student"><RequestSession /></RoleRoute></ProtectedRoute>} />
            <Route path="/live-session/:sessionId" element={<AuthOnlyRoute><LiveSession /></AuthOnlyRoute>} />

            {/* Onboarding */}
            <Route path="/onboarding/student" element={<ProtectedRoute><StudentOnboarding /></ProtectedRoute>} />
            <Route path="/onboarding/mentor" element={<ProtectedRoute><MentorOnboarding /></ProtectedRoute>} />

            {/* AI Assistant */}
            <Route path="/ai-chat" element={<AuthOnlyRoute><AIAssistant /></AuthOnlyRoute>} />

            {/* Features */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/messages/:tab?/:chatId?" element={<ProtectedRoute><DirectMessages /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><StudentAnalytics /></ProtectedRoute>} />
            <Route path="/mentor/analytics" element={<ProtectedRoute><RoleRoute role="mentor"><MentorAnalytics /></RoleRoute></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/projects" element={<AdminRoute><AdminProjects /></AdminRoute>} />
            <Route path="/admin/mentorship" element={<AdminRoute><AdminMentorship /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
            <Route path="/admin/system-health" element={<AdminRoute><AdminSystemHealth /></AdminRoute>} />
            <Route path="/admin/mentor-invites" element={<AdminRoute><AdminMentorInvites /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
    </Router>
  );
}

export default App;