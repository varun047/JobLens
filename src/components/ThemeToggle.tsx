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
      return <div className="w-24 h-8 rounded-full bg-black/30 border border-white/5" />;
    }
    return <div className="w-8 h-8 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50" />;
  }

  const isDark = theme === 'dark';

  if (variant === 'sidebar') {
    return (
      <div className="flex bg-black/30 border border-white/5 rounded-full p-0.5 w-24 h-8 items-center justify-between relative select-none">
        {/* Slidable glass thumb */}
        <div
          className={`absolute top-0.5 bottom-0.5 w-[44px] rounded-full bg-white/10 border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out ${
            isDark ? 'left-[50px]' : 'left-[2px]'
          }`}
        />

        {/* Light button */}
        <button
          onClick={() => setTheme('light')}
          className={`z-10 w-11 h-full flex items-center justify-center rounded-full transition-colors duration-300 cursor-pointer ${
            !isDark ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Light Mode"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </button>

        {/* Dark button */}
        <button
          onClick={() => setTheme('dark')}
          className={`z-10 w-11 h-full flex items-center justify-center rounded-full transition-colors duration-300 cursor-pointer ${
            isDark ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Dark Mode"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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

