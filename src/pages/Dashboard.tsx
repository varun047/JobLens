import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';

const languageColors: Record<string, string> = {
  JavaScript: 'bg-yellow-400',
  TypeScript: 'bg-blue-400',
  Python: 'bg-green-400',
  HTML: 'bg-orange-400',
  CSS: 'bg-purple-400',
  Ruby: 'bg-red-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-600',
  Java: 'bg-amber-600',
  'C++': 'bg-pink-500',
  C: 'bg-gray-400',
  Swift: 'bg-orange-500',
  Kotlin: 'bg-violet-400',
  PHP: 'bg-indigo-400',
  Shell: 'bg-lime-400',
};

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    repos,
    loading,
    error,
    fetchRepos,
    repoAnalyses,
    analysisStatus,
    analysisProgress,
    analyzeAllRepos,
    reAnalyzeAllRepos,
  } = useRepoStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [prevStatus, setPrevStatus] = useState(analysisStatus);

  useEffect(() => {
    if (user?.provider_token && repos.length === 0) {
      fetchRepos(user.provider_token);
    }
  }, [user?.provider_token, repos.length, fetchRepos]);

  // Trigger background codebase analysis when repos load
  useEffect(() => {
    if (user?.id && repos.length > 0 && analysisStatus === 'idle') {
      analyzeAllRepos(user.id);
    }
  }, [user?.id, repos.length, analysisStatus, analyzeAllRepos]);

  // Handle showing toast notification on completion
  useEffect(() => {
    if (prevStatus === 'analyzing' && analysisStatus === 'done') {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevStatus(analysisStatus);
  }, [analysisStatus, prevStatus]);

  const handleRefresh = () => {
    if (user?.provider_token) {
      fetchRepos(user.provider_token);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.language &&
        repo.language.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (repo.description &&
        repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const truncateText = (text: string | null | undefined, length: number) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const lastUpdatedText = () => {
    if (!repoAnalyses || repoAnalyses.length === 0) return 'Never';
    const dates = repoAnalyses.map(a => a.analyzed_at ? new Date(a.analyzed_at).getTime() : 0);
    if (dates.length === 0 || Math.max(...dates) === 0) return 'Today';
    const maxDate = new Date(Math.max(...dates));
    const diffTime = Math.abs(new Date().getTime() - maxDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    return `${diffDays} days ago`;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            GitHub Repositories
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Select projects to include in your resume modifications during tailored exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#141414] border border-zinc-900 focus:border-zinc-700 text-xs px-4 py-2 rounded-xl focus:outline-none w-full md:w-60 text-zinc-200"
          />
          <button
            onClick={handleRefresh}
            disabled={loading || !user?.provider_token}
            className="border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-950 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {loading && (
              <div className="w-3 h-3 border border-zinc-650 border-t-zinc-250 rounded-full animate-spin"></div>
            )}
            Refresh Sync
          </button>
        </div>
      </div>

      {/* Codebase Analysis Status Card */}
      {analysisStatus === 'analyzing' && (
        <div className="mb-6 bg-[#121212] border border-zinc-800 rounded-xl p-5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-zinc-800/80 border-t-white rounded-full"></span>
              <span>🔍 Analyzing your GitHub projects</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">
              This runs once and is cached for 7 days
            </span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-zinc-400">
              <span>
                Processing:{' '}
                <span className="font-mono text-white">
                  {analysisProgress.currentRepo || 'Initializing'}
                </span>{' '}
                ({analysisProgress.current} of {analysisProgress.total})
              </span>
              <span className="font-bold">
                {Math.round(
                  (analysisProgress.current / (analysisProgress.total || 1)) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (analysisProgress.current / (analysisProgress.total || 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {analysisStatus === 'done' && (
        <div className="mb-6 bg-[#121212] border border-zinc-800 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">
                {repos.length} projects analyzed and ready
              </h4>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Last updated: {lastUpdatedText()}
              </p>
            </div>
          </div>
          <button
            onClick={() => user?.id && reAnalyzeAllRepos(user.id)}
            className="text-[10px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg bg-zinc-950 transition-all cursor-pointer font-medium"
          >
            Re-analyze
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-950 border border-emerald-900 text-emerald-400 text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>All {repos.length} projects analyzed and ready</span>
        </div>
      )}

      {/* Warning if no token */}
      {!user?.provider_token && (
        <div className="p-4 mb-6 bg-amber-950/20 border border-amber-900/30 rounded-xl text-amber-400 text-xs">
          <p className="font-semibold mb-1">GitHub Token Missing</p>
          We couldn't retrieve your GitHub access token. Please sign out and sign
          in again to authenticate with GitHub and synchronize your repositories.
        </div>
      )}

      {/* Error Info */}
      {error && (
        <div className="p-3 mb-6 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Repos Grid */}
      {loading && repos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="border border-zinc-900 bg-[#121212] rounded-xl p-5 h-44 animate-pulse space-y-4"
            >
              <div className="h-4 w-1/3 bg-zinc-850 rounded"></div>
              <div className="h-3 w-1/4 bg-zinc-850 rounded"></div>
              <div className="h-10 w-full bg-zinc-850 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="border border-dashed border-zinc-900 rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <svg
            className="w-10 h-10 text-zinc-650 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-xs font-medium text-zinc-400">
            {repos.length === 0 ? 'No repositories found' : 'No matching repositories'}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {repos.length === 0
              ? 'Make sure you have public repositories in your GitHub account.'
              : 'Try adjusting your search query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <a
              key={repo.name}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-zinc-900 bg-[#121212] hover:bg-[#151515] hover:border-zinc-800 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 group text-left shadow-sm"
            >
              <div>
                {/* Repo Header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white group-hover:text-zinc-250 transition-colors">
                    {repo.name}
                  </h3>
                  <div className="flex items-center gap-1.5 bg-[#171717] px-2 py-0.5 rounded border border-zinc-850">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        languageColors[repo.language || ''] || 'bg-zinc-500'
                      }`}
                    ></span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {repo.language || 'Other'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-zinc-500 text-[11px] leading-relaxed mb-4">
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              {/* README Preview Box */}
              <div className="mt-auto">
                <div className="bg-[#161616] border border-zinc-850 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-zinc-650 tracking-wider uppercase block mb-1">
                    README Preview
                  </span>
                  <p className="text-zinc-400 text-[10px] leading-relaxed font-mono italic">
                    {repo.readme
                      ? truncateText(repo.readme, 100)
                      : 'No README.md content available.'}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
