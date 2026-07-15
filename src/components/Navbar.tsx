import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useResumeStore } from '../store/resumeStore';
import { ThemeToggle } from './ThemeToggle';
import { useAppThemeStore } from '../store/themeStore';
import { useHistoryStore } from '../store/historyStore';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { selectedTheme } = useAppThemeStore();
  const clearRepos = useRepoStore((state) => state.clearRepos);
  const clearResume = useResumeStore((state) => state.clearResume);
  const location = useLocation();
  const navigate = useNavigate();

  const { fetchHistory } = useHistoryStore();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

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
    const color = active ? 'text-[var(--theme-accent)]' : 'text-zinc-400 group-hover:text-white';
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
        className={`group flex items-center justify-between px-4 py-3 transition-all duration-300 ease-out rounded-2xl border backdrop-blur-md cursor-pointer ${
          active
            ? 'font-body text-sm font-semibold text-white bg-white/10 border-white/20 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/15 hover:border-white/25'
            : 'font-body text-sm font-medium text-white/60 hover:text-white bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.08] hover:border-white/15 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] transition-colors'
        }`}
        style={active ? {
          boxShadow: '0 8px 20px -6px var(--theme-glow-color), inset 0 1px 0 rgba(255,255,255,0.1)'
        } : undefined}
      >
        <div className="flex items-center gap-3">
          {renderSidebarIcon(label, active)}
          <span>{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm transition-all ${
            active 
              ? 'bg-[var(--theme-accent)] text-white' 
              : 'bg-white/10 text-zinc-300 group-hover:bg-white/20 group-hover:text-white'
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const isMoreTabActive = isMoreOpen || ['/onboarding', '/templates', '/history', '/analytics'].includes(location.pathname);

  return (
    <>
      {/* Desktop Vertical Sidebar */}
      <aside className="md:flex hidden flex-col w-64 h-screen fixed left-0 top-0 bg-gradient-to-b from-zinc-950/95 via-[var(--theme-accent-tint)] to-zinc-950/98 border-r border-white/5 py-8 z-50 justify-between px-4">
        <div className="flex flex-col">
          {/* Logo Header */}
          <Link to="/dashboard" className="flex items-center gap-3 px-2 mb-10 cursor-pointer">
            <img src="/favicon.svg" className="w-8 h-8 rounded-lg" />
            <span className="font-heading font-bold text-base tracking-tight text-white">
              Job<span className="text-[var(--theme-accent)]">Lens</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-6">
            {/* Category 1: Core Features */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-[2px] block mb-1.5 px-3">
                Core Features
              </span>
              {renderSidebarLink('/dashboard', 'Dashboard')}
              {renderSidebarLink('/analyze', 'Analyze')}
              {renderSidebarLink('/resumes', 'Resumes')}
            </div>

            {/* Category 2: Setup & Tools */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-[2px] block mb-1.5 px-3">
                Setup & Tools
              </span>
              {renderSidebarLink('/onboarding', 'Resume Profile')}
              {renderSidebarLink('/templates', 'Templates')}
              {renderSidebarLink('/history', 'History')}
              {renderSidebarLink('/analytics', 'Analytics')}
            </div>
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
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] h-14 bg-white/85 dark:bg-[#0c0c0e]/85 border border-zinc-200/40 dark:border-zinc-850 rounded-full px-4 flex items-center justify-between shadow-[0_12px_35px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl z-[100] animate-fadeIn transition-colors duration-250">
        {/* Tab 1: More Options (Far Left) */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`w-10 h-10 rounded-full flex flex-col items-center justify-center relative transition-all duration-300 active:scale-90 cursor-pointer ${
            isMoreTabActive
              ? 'text-[var(--theme-accent)]'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          title="More Options"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          {isMoreTabActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] absolute bottom-0.5" style={{ boxShadow: '0 0 8px var(--theme-glow-color)' }} />
          )}
        </button>

        {/* Tab 2: Dashboard (Home) */}
        <Link
          to="/dashboard"
          className={`w-10 h-10 rounded-full flex flex-col items-center justify-center relative transition-all duration-300 active:scale-90 ${
            isActive('/dashboard')
              ? 'text-[var(--theme-accent)]'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          title="Dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {isActive('/dashboard') && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] absolute bottom-0.5" style={{ boxShadow: '0 0 8px var(--theme-glow-color)' }} />
          )}
        </Link>

        {/* Tab 3: Analyze (Center FAB - Core Value Action) */}
        <Link
          to="/analyze"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 transform -translate-y-2.5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white ${
            isActive('/analyze')
              ? 'ring-4 ring-[var(--theme-accent-tint)] scale-105 shadow-lg'
              : ''
          }`}
          style={{
            boxShadow: isActive('/analyze') ? '0 8px 25px var(--theme-glow-color)' : '0 4px 14px var(--theme-glow-color)'
          }}
          title="Analyze"
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
        </Link>

        {/* Tab 4: Resumes */}
        <Link
          to="/resumes"
          className={`w-10 h-10 rounded-full flex flex-col items-center justify-center relative transition-all duration-300 active:scale-90 ${
            isActive('/resumes')
              ? 'text-[var(--theme-accent)]'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          title="Resumes"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          {isActive('/resumes') && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] absolute bottom-0.5" style={{ boxShadow: '0 0 8px var(--theme-glow-color)' }} />
          )}
        </Link>

        {/* Tab 5: Profile (Far Right) */}
        <Link
          to="/onboarding"
          className="w-10 h-10 rounded-full flex items-center justify-center relative transition-all duration-300 active:scale-90"
          title="Profile"
        >
          <img
            src={user.avatar_url}
            className={`w-7 h-7 rounded-full object-cover border transition-all duration-300 ${
              isActive('/onboarding')
                ? 'border-[var(--theme-accent)] scale-105'
                : 'border-zinc-200 dark:border-zinc-800'
            }`}
            style={isActive('/onboarding') ? { boxShadow: '0 0 12px var(--theme-glow-color)' } : undefined}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80';
            }}
          />
          {isActive('/onboarding') && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] absolute bottom-0.5" style={{ boxShadow: '0 0 8px var(--theme-glow-color)' }} />
          )}
        </Link>
      </div>

      {/* Drawer Overlay */}
      {isMoreOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[110] transition-opacity animate-fadeIn" 
          onClick={() => setIsMoreOpen(false)} 
        />
      )}

      {/* Drawer Container */}
      {isMoreOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0c0c0e]/95 border-t border-zinc-200 dark:border-zinc-850 rounded-t-3xl p-6 z-[120] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] backdrop-blur-md animate-slideUp transition-all duration-300">
          <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
          
          <h3 className="font-heading text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-1">
            Setup & Navigation Tools
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link 
              to="/onboarding" 
              onClick={() => setIsMoreOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-955/40 border border-zinc-150 dark:border-zinc-900/60 active:scale-95 transition-all cursor-pointer"
            >
              <div className="p-2 bg-[var(--theme-accent-tint)] text-[var(--theme-accent-text)] rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">Profile</span>
                <span className="text-[9px] text-zinc-455 dark:text-zinc-500 truncate">Base Resume</span>
              </div>
            </Link>

            <Link 
              to="/templates" 
              onClick={() => setIsMoreOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-955/40 border border-zinc-150 dark:border-zinc-900/60 active:scale-95 transition-all cursor-pointer"
            >
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">Templates</span>
                <span className="text-[9px] text-zinc-455 dark:text-zinc-500 truncate">Doc Styles</span>
              </div>
            </Link>

            <Link 
              to="/history" 
              onClick={() => setIsMoreOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-955/40 border border-zinc-150 dark:border-zinc-900/60 active:scale-95 transition-all cursor-pointer"
            >
              <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">History</span>
                <span className="text-[9px] text-zinc-455 dark:text-zinc-500 truncate">Logs & History</span>
              </div>
            </Link>

            <Link 
              to="/analytics" 
              onClick={() => setIsMoreOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50/55 dark:bg-zinc-955/40 border border-zinc-150 dark:border-zinc-900/60 active:scale-95 transition-all cursor-pointer"
            >
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">Analytics</span>
                <span className="text-[9px] text-zinc-455 dark:text-zinc-500 truncate">Score Trends</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-850/60 pt-4 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user.avatar_url}
                className="w-7.5 h-7.5 rounded-full object-cover border border-zinc-200 dark:border-zinc-850"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80';
                }}
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-xs font-bold text-zinc-250 truncate max-w-[150px]">
                  {user.name}
                </span>
                <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500">Free Account</span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsMoreOpen(false);
                handleLogout();
              }}
              className="text-xs font-bold text-red-500 hover:text-red-655 bg-red-50/50 dark:bg-red-955/20 border border-red-100 dark:border-red-900/40 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <div className="md:hidden fixed top-4 right-4 z-[100]">
        <ThemeToggle />
      </div>
    </>
  );
};

export default Navbar;
