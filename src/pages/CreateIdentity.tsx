import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppThemeStore, type AppTheme } from '../store/themeStore';

export default function CreateIdentity() {
  const { user } = useAuthStore();
  const { selectedTheme, setTheme, saveIdentity } = useAppThemeStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill user name from authStore when available
  useEffect(() => {
    if (user?.name && !displayName) {
      setDisplayName(user.name);
    }
  }, [user?.name, displayName]);

  const memberSince = new Date()
    .toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!title.trim()) {
      setError('Professional title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await saveIdentity(user.id, {
        title: title.trim(),
        tagline: tagline.trim(),
        theme: selectedTheme,
      });
      // Redirect to onboarding/resume upload page
      navigate('/onboarding');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save identity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const themesList: {
    id: AppTheme;
    name: string;
    persona: string;
    description: string;
    colorClass: string;
    bgClass: string;
  }[] = [
    {
      id: 'emerald',
      name: 'Emerald',
      persona: 'The Builder',
      description: 'Unlocks custom brand coloring and project complexity insights',
      colorClass: 'bg-emerald-500',
      bgClass: 'from-emerald-500/10 to-emerald-500/0',
    },
    {
      id: 'violet',
      name: 'Violet',
      persona: 'The Strategist',
      description: 'Unlocks Focus Mode for distraction-free analysis',
      colorClass: 'bg-indigo-500',
      bgClass: 'from-indigo-500/10 to-indigo-500/0',
    },
    {
      id: 'amber',
      name: 'Amber',
      persona: 'The Competitor',
      description: 'Unlocks competitive score tracking and detailed metric validation warnings',
      colorClass: 'bg-amber-500',
      bgClass: 'from-amber-500/10 to-amber-500/0',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#080808] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Badge Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center lg:sticky lg:top-8">
          <h2 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
            Live Badge Preview
          </h2>
          
          {/* Simulated Physical ID Badge Container */}
          <div className="relative group transition-all duration-300">
            {/* Lanyard Strap Loop */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-6 bg-zinc-800 dark:bg-zinc-700 rounded-t-lg shadow-md flex items-center justify-center z-10">
              <div className="w-8 h-2.5 bg-[#080808] rounded-full border border-zinc-700"></div>
            </div>
            
            {/* Holographic Glowing Border matching the theme */}
            <div 
              className="absolute -inset-1 rounded-[var(--theme-border-radius-card)] opacity-30 blur-lg transition duration-500 group-hover:opacity-60"
              style={{
                background: 'linear-gradient(to bottom, var(--theme-accent), transparent)',
              }}
            ></div>

            {/* The Badge Card */}
            <div 
              className="relative w-80 h-[480px] bg-white dark:bg-[#0f0f0f] border border-zinc-200 dark:border-zinc-800/80 shadow-2xl flex flex-col justify-between overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 'var(--theme-border-radius-card)',
              }}
            >
              {/* Dynamic Colored Header Accent Band */}
              <div 
                className="h-4 w-full transition-colors duration-300"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              />

              {/* Card Body */}
              <div className="px-6 pt-4 flex-grow flex flex-col items-center relative">
                {/* Logo & Card Type */}
                <div className="w-full flex justify-between items-center mb-6">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-zinc-800 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    <span className="text-[10px] font-bold tracking-widest text-zinc-800 dark:text-zinc-200 uppercase font-heading">
                      JobLens // Portal
                    </span>
                  </div>
                  <span 
                    className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border transition-colors duration-300"
                    style={{ 
                      borderColor: 'var(--theme-accent)',
                      color: 'var(--theme-accent-text)',
                      backgroundColor: 'var(--theme-accent-tint)'
                    }}
                  >
                    ACCESS
                  </span>
                </div>

                {/* Avatar Wrapper */}
                <div className="relative mb-6">
                  {/* Rotating Scanning Ring around Avatar */}
                  <div 
                    className="absolute -inset-1 rounded-full opacity-60 animate-pulse transition-colors duration-300"
                    style={{
                      border: '2px dashed var(--theme-accent)',
                    }}
                  />
                  
                  {/* Photo Container */}
                  <div className="w-24 h-24 rounded-full border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center relative">
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Profile Information */}
                <div className="text-center w-full px-2 flex-grow flex flex-col justify-between">
                  <div>
                    {/* User Name */}
                    <h3 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 truncate font-heading">
                      {displayName.trim() || 'Your Full Name'}
                    </h3>
                    
                    {/* User Title */}
                    <p 
                      className="text-xs font-semibold tracking-wide mt-1 uppercase transition-colors duration-300"
                      style={{ color: 'var(--theme-accent-text)' }}
                    >
                      {title.trim() || 'e.g. Software Engineer'}
                    </p>

                    {/* Tagline */}
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 px-4 italic line-clamp-2 leading-relaxed">
                      "{tagline.trim() || 'Building fast, shipping faster.'}"
                    </p>
                  </div>

                  {/* Smartcard EMV Chip */}
                  <div className="my-4 flex justify-between items-center w-full px-2">
                    <div className="w-10 h-8 rounded-md bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 border border-amber-700/20 shadow-inner flex flex-col justify-between p-1">
                      <div className="flex justify-between">
                        <div className="w-2.5 h-1.5 border-r border-b border-amber-800/40"></div>
                        <div className="w-2.5 h-1.5 border-l border-b border-amber-800/40"></div>
                      </div>
                      <div className="h-0.5 w-full bg-amber-800/20"></div>
                      <div className="flex justify-between">
                        <div className="w-2.5 h-1.5 border-r border-t border-amber-800/40"></div>
                        <div className="w-2.5 h-1.5 border-l border-t border-amber-800/40"></div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[7px] text-zinc-400 uppercase tracking-widest block">Member Since</span>
                      <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">{memberSince}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Colored Footer Accent Band & Barcode */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 px-6 py-3 flex items-center justify-between">
                {/* Simulated Barcode */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-end gap-[1.5px] h-6">
                    <div className="w-0.5 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-[1px] h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-1 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-0.5 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-[1.5px] h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-0.5 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-[1px] h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-1.5 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-[1.5px] h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-0.5 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-1 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                    <div className="w-0.5 h-full bg-zinc-800 dark:bg-zinc-300"></div>
                  </div>
                  <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-500 tracking-wider">
                    *JL-{user?.id ? user.id.slice(0, 8).toUpperCase() : 'AUTH'}*
                  </span>
                </div>
                
                {/* Fingerprint scan design element */}
                <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12a7.5 7.5 0 00-1.5-4.5M4.5 12a7.5 7.5 0 001.5 4.5M12 3a9 9 0 019 9M12 3a9 9 0 00-9 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 font-heading">
              Configure Your Agent Persona
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Create your secure developer ID badge and select your tailored analytical focus mode.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Inputs Group */}
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Professional Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="tagline" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Tagline / Bio
                </label>
                <input
                  id="tagline"
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Building fast, shipping faster"
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] transition-all duration-200"
                />
              </div>
            </div>

            {/* Swatch-style Theme Selection */}
            <div>
              <span className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Select Your Persona Theme
              </span>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {themesList.map((themeItem) => {
                  const isSelected = selectedTheme === themeItem.id;
                  return (
                    <button
                      key={themeItem.id}
                      type="button"
                      onClick={() => setTheme(themeItem.id)}
                      className={`relative flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 ${
                        isSelected 
                          ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)] bg-zinc-100/50 dark:bg-zinc-900/80 shadow-md' 
                          : 'border-zinc-200 dark:border-zinc-800/80'
                      }`}
                    >
                      {/* Colored strip inside swatch */}
                      <div className="flex items-center justify-between mb-3 w-full">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${themeItem.colorClass}`} />
                          <span className="text-xs font-bold text-zinc-950 dark:text-zinc-100 font-heading">
                            {themeItem.name}
                          </span>
                        </div>
                        {isSelected && (
                          <svg 
                            className="w-4 h-4 text-emerald-500" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            viewBox="0 0 24 24"
                            style={{ color: 'var(--theme-accent)' }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <span 
                        className="text-[10px] font-bold tracking-wide uppercase"
                        style={{ color: isSelected ? 'var(--theme-accent-text)' : '#71717a' }}
                      >
                        {themeItem.persona}
                      </span>
                      
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-3 leading-snug">
                        {themeItem.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-accent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-3 h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Badge...
                </span>
              ) : (
                'Create my ID & Proceed'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
