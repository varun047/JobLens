import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useResumeStore } from '../store/resumeStore';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const clearRepos = useRepoStore((state) => state.clearRepos);
  const clearResume = useResumeStore((state) => state.clearResume);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    clearRepos();
    clearResume();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
            <span className="text-[#0f0f0f] font-black text-xs">R</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white group-hover:text-zinc-300 transition-colors">
            ResumeAI
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive('/dashboard')
                ? 'bg-zinc-900 text-white border border-zinc-800'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/onboarding"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive('/onboarding')
                ? 'bg-zinc-900 text-white border border-zinc-800'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Resume Profile
          </Link>
          <Link
            to="/analyze"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive('/analyze')
                ? 'bg-zinc-900 text-white border border-zinc-800'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Analyze
          </Link>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-7 h-7 rounded-full border border-zinc-800"
              onError={(e) => {
                // Fallback avatar if user.avatar_url fails
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80';
              }}
            />
            <span className="text-xs font-medium text-zinc-300 hidden sm:inline">
              {user.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors border border-zinc-800 hover:border-red-950 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-red-950/20"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
