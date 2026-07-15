import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppThemeStore } from '../store/themeStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuthStore();
  const { identityCompleted, identityLoaded } = useAppThemeStore();
  const location = useLocation();

  const loading = authLoading || (user && !identityLoaded);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold tracking-wider uppercase">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to identity card creation screen if incomplete
  if (!identityCompleted && location.pathname !== '/create-identity') {
    return <Navigate to="/create-identity" replace />;
  }

  // Prevent accessing identity creation screen once completed
  if (identityCompleted && location.pathname === '/create-identity') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
