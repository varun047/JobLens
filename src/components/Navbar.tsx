import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useResumeStore } from '../store/resumeStore';
import { ThemeToggle } from './ThemeToggle';
import { useHistoryStore } from '../store/historyStore';
import { Logo } from './Logo';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const clearRepos = useRepoStore((state) => state.clearRepos);
  const clearResume = useResumeStore((state) => state.clearResume);
  const location = useLocation();
  const navigate = useNavigate();

  const { analyses, fetchHistory } = useHistoryStore();

  React.useEffect(() => {
    if (user?.id) {
      fetchHistory(user.id);
    }
  }, [user?.id, fetchHistory]);

  const handleLogout = async () => {
    await logout();
    clearRepos();
    clearResume();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const renderSidebarIcon = (label: string, active: boolean) => {
    const color = active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 group-hover:text-white';
    const stroke = "2.2";
    switch (label) {
      case 'Dashboard':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        );
      case 'Resume Profile':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        );
      case 'Analyze':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
        );
      case 'Resumes':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        );
      case 'Templates':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        );
      case 'History':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Analytics':
        return (
          <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderSidebarLink = (to: string, label: string, badge?: number) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`group flex items-center justify-between px-4 py-3 text-xs font-semibold tracking-wide transition-all duration-300 ease-out rounded-2xl border backdrop-blur-md cursor-pointer ${
          active
            ? 'bg-white/10 border-white/20 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/15 hover:border-white/25 hover:shadow-[0_12px_24px_-4px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]'
            : 'bg-white/[0.02] border-white/[0.05] text-zinc-300 hover:text-white hover:bg-white/[0.08] hover:border-white/15 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:scale-[1.02]'
        }`}
      >
        <div className="flex items-center gap-3">
          {renderSidebarIcon(label, active)}
          <span>{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm transition-all ${
            active 
              ? 'bg-emerald-600 text-white' 
              : 'bg-white/10 text-zinc-300 group-hover:bg-white/20 group-hover:text-white'
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Vertical Sidebar */}
      <aside className="md:flex hidden flex-col w-64 h-screen fixed left-0 top-0 bg-gradient-to-b from-teal-955/95 via-emerald-950/95 to-zinc-955/98 border-r border-white/5 py-8 z-50 justify-between px-4">
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
              <Logo size={20} />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              JobLens
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-3">
            {renderSidebarLink('/dashboard', 'Dashboard')}
            {renderSidebarLink('/onboarding', 'Resume Profile')}
            {renderSidebarLink('/analyze', 'Analyze')}
            {renderSidebarLink('/resumes', 'Resumes', analyses.length)}
            {renderSidebarLink('/templates', 'Templates')}
            {renderSidebarLink('/history', 'History', analyses.length)}
            {renderSidebarLink('/analytics', 'Analytics')}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="flex flex-col gap-6 items-center px-2 pt-6 border-t border-white/10">
          {/* Vertical Capsule Theme Switch */}
          <ThemeToggle variant="sidebar" />
          
          {/* User badge */}
          <div className="w-full flex items-center justify-between p-1.5 rounded-xl gap-2 hover:bg-white/5 transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-white/10 shadow-sm object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80';
                }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white truncate max-w-[110px] tracking-tight leading-tight">
                  {user.name}
                </span>
                <span className="text-[9px] font-semibold text-zinc-400">
                  Free Account
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-[420px] bg-white/95 dark:bg-black/90 border border-zinc-200 dark:border-zinc-850 rounded-full py-2 px-3 flex items-center justify-between shadow-[0_15px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md z-50 animate-fadeIn transition-colors duration-250">
        {/* Item 1: House (Dashboard) */}
        <Link
          to="/dashboard"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 ${
            isActive('/dashboard')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-white'
          }`}
          title="Dashboard"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </Link>
 
        {/* Item 2: Search (Analyze) */}
        <Link
          to="/analyze"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 ${
            isActive('/analyze')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-white'
          }`}
          title="Analyze"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
        </Link>
 
        {/* Item 3: Document (Resume Profile) */}
        <Link
          to="/onboarding"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 relative ${
            isActive('/onboarding')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-white'
          }`}
          title="Resume Profile"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white dark:border-black animate-pulse"></span>
        </Link>

        {/* Item 3.5: Resumes (Briefcase / Collection icon) */}
        <Link
          to="/resumes"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 relative ${
            isActive('/resumes')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-white'
          }`}
          title="Resumes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          {analyses.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 dark:bg-emerald-700 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold border border-white dark:border-black shadow-sm">
              {analyses.length}
            </span>
          )}
        </Link>
 
        {/* Item 3.7: Templates */}
        <Link
          to="/templates"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 relative ${
            isActive('/templates')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-655 dark:hover:text-white'
          }`}
          title="Templates"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        </Link>
 
        {/* Item 4: List (History) */}
        <Link
          to="/history"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 relative ${
            isActive('/history')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-white'
          }`}
          title="History"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {analyses.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 dark:bg-emerald-700 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold border border-white dark:border-black shadow-sm">
              {analyses.length}
            </span>
          )}
        </Link>
 
        {/* Item 5: Analytics Chart */}
        <Link
          to="/analytics"
          className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 ${
            isActive('/analytics')
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] shadow-md scale-105'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-white'
          }`}
          title="Analytics"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </Link>
 
        {/* Item 6: Log out */}
        <button
          onClick={handleLogout}
          className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </>
  );
};

export default Navbar;
