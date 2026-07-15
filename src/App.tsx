import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';
import Analytics from './pages/Analytics';
import History from './pages/History';
import { Resumes } from './pages/Resumes';
import Templates from './pages/Templates';
import CreateIdentity from './pages/CreateIdentity';
import { useAuthStore } from './store/authStore';
import { useAppThemeStore } from './store/themeStore';
import { supabase } from './lib/supabase';

function App() {
  const { user, setSession, setLoading } = useAuthStore();
  const selectedTheme = useAppThemeStore((state) => state.selectedTheme);
  const syncFromSupabase = useAppThemeStore((state) => state.syncFromSupabase);

  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    if (user?.id) {
      syncFromSupabase(user.id);
    }
  }, [user?.id, syncFromSupabase]);

  useEffect(() => {
    // Check current session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(() => {
        setLoading(false);
      });

    // Listen to session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setLoading]);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isCreateIdentity = location.pathname === '/create-identity';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0f0f] text-zinc-950 dark:text-zinc-200 flex flex-col transition-colors duration-200">
      {!isCreateIdentity && <Navbar />}
      <main className={`flex-grow pb-24 md:pb-0 ${user && !isCreateIdentity ? 'md:pl-64' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/create-identity"
            element={
              <ProtectedRoute>
                <CreateIdentity />
              </ProtectedRoute>
            }
          />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <Analyze />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resumes"
            element={
              <ProtectedRoute>
                <Resumes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />

          {/* Redirect root and unknown paths to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
