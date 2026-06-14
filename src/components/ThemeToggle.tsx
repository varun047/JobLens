import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle({ variant = 'default' }: { variant?: 'default' | 'sidebar' }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting until client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (variant === 'sidebar') {
      return <div className="w-[90px] h-[52px] rounded-2xl bg-zinc-950/30 dark:bg-black/50 border border-zinc-200/10 dark:border-zinc-800/20" />;
    }
    return <div className="w-8 h-8 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50" />;
  }

  const isDark = theme === 'dark';

  if (variant === 'sidebar') {
    return (
      <div className="flex gap-2 p-1 bg-zinc-950/30 dark:bg-black/50 border border-zinc-200/10 dark:border-zinc-800/25 rounded-2xl w-[94px] h-[48px] items-center justify-center shadow-inner transition-colors">
        {/* Light switch */}
        <button
          onClick={() => setTheme('light')}
          className={`w-9 h-[38px] rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
            !isDark
              ? 'bg-white text-amber-500 shadow-[0_3px_10px_rgba(251,191,36,0.35)] border border-amber-200/50 scale-105'
              : 'text-zinc-550 dark:text-zinc-500 hover:text-zinc-400'
          }`}
          title="Light Mode"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </button>
        {/* Dark switch */}
        <button
          onClick={() => setTheme('dark')}
          className={`w-9 h-[38px] rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
            isDark
              ? 'bg-zinc-900 text-indigo-400 shadow-[0_3px_10px_rgba(99,102,241,0.45)] border border-zinc-800 scale-105'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Dark Mode"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-[#121212]/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        // Sun icon for dark mode (click to go light)
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        // Moon icon for light mode (click to go dark)
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

