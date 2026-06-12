import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const { user, login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async () => {
    await login();
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm bg-[#141414] border border-zinc-900 rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col items-center">
        {/* Logo Icon */}
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-6 shadow-lg shadow-white/5">
          <span className="text-[#0f0f0f] font-black text-lg">R</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-white tracking-tight mb-2">
          Welcome to ResumeAI
        </h1>
        <p className="text-zinc-500 text-xs text-center mb-8">
          The agentic resume tailoring tool. Connect your GitHub and generate
          perfectly tailored resumes in seconds.
        </p>

        {/* Error message */}
        {error && (
          <div className="w-full p-3 mb-6 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* OAuth Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white text-[#0f0f0f] hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-zinc-850 border-t-zinc-350 rounded-full animate-spin"></div>
          ) : (
            <>
              {/* GitHub SVG Icon */}
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </>
          )}
        </button>

        {/* Footer */}
        <span className="text-[10px] text-zinc-600 mt-6 tracking-wide uppercase">
          Secure OAuth authentication
        </span>
      </div>
    </div>
  );
};

export default Login;
