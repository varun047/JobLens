import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useAppThemeStore } from '../store/themeStore';
import { useHistoryStore } from '../store/historyStore';

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
  Kotlin: 'bg-emerald-400',
  PHP: 'bg-indigo-400',
  Shell: 'bg-lime-400',
};

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedTheme } = useAppThemeStore();
  const { history, fetchHistory, loading: historyLoading } = useHistoryStore();
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
    generatingReadmeFor,
    pushingReadmeFor,
    bulkReadmeProgress,
    generateReadme,
    pushReadme,
    bulkGenerateReadmes,
  } = useRepoStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [prevStatus, setPrevStatus] = useState(analysisStatus);

  // README Management States
  const [confirmingUpdateRepo, setConfirmingUpdateRepo] = useState<string | null>(null);
  const [activeReadmeModalRepo, setActiveReadmeModalRepo] = useState<string | null>(null);
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [showPushToast, setShowPushToast] = useState(false);
  const [pushedRepoName, setPushedRepoName] = useState('');
  const [showBulkToast, setShowBulkToast] = useState(false);
  const [bulkToastCount, setBulkToastCount] = useState(0);
  const [prevBulkProgress, setPrevBulkProgress] = useState<string | null>(bulkReadmeProgress);

  useEffect(() => {
    if (user?.provider_token && repos.length === 0) {
      fetchRepos(user.provider_token);
    }
  }, [user?.provider_token, repos.length, fetchRepos]);

  // Fetch analysis history for Career Radar and Score Streak widgets
  useEffect(() => {
    if (user?.id && (selectedTheme === 'violet' || selectedTheme === 'amber')) {
      fetchHistory(user.id);
    }
  }, [user?.id, selectedTheme, fetchHistory]);

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

  // Handle showing toast notification on bulk README generation completion
  useEffect(() => {
    if (prevBulkProgress !== null && bulkReadmeProgress === null) {
      setShowBulkToast(true);
      const timer = setTimeout(() => setShowBulkToast(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevBulkProgress(bulkReadmeProgress);
  }, [bulkReadmeProgress, prevBulkProgress]);

  const handleRefresh = () => {
    if (user?.provider_token) {
      fetchRepos(user.provider_token);
    }
  };

  const handleGenerateReadme = async (repoName: string) => {
    try {
      const generated = await generateReadme(repoName);
      setReadmeContent(generated);
      setActiveReadmeModalRepo(repoName);
      setIsEdited(false);
    } catch (err: any) {
      console.error('Error generating README:', err);
      alert(err.message || 'Failed to generate README.');
    }
  };

  const handleBulkGenerate = async () => {
    if (!user?.id) return;
    const count = repos.filter((r) => !r.hasReadme).length;
    setBulkToastCount(count);
    await bulkGenerateReadmes(user.id);
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(readmeContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePushToGitHub = async () => {
    if (!user?.id || !activeReadmeModalRepo) return;
    try {
      await pushReadme(user.id, activeReadmeModalRepo, readmeContent);
      setPushedRepoName(activeReadmeModalRepo);
      setShowPushToast(true);
      setTimeout(() => setShowPushToast(false), 4000);
      setActiveReadmeModalRepo(null);
      setReadmeContent('');
      setIsEdited(false);
    } catch (err: any) {
      console.error('Error pushing README:', err);
      alert(err.message || 'Failed to push README to GitHub.');
    }
  };

  const handleCloseModal = () => {
    if (isEdited) {
      const confirmDiscard = window.confirm('Discard unsaved changes to this README?');
      if (!confirmDiscard) return;
    }
    setActiveReadmeModalRepo(null);
    setReadmeContent('');
    setIsEdited(false);
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

  const missingReadmeCount = repos.filter(r => !r.hasReadme).length;

  // Compute Amber streak: count of most-recent consecutive saved analyses ordered by date (history is desc)
  // where each analysis's ats_score.after is greater than or equal to the previous one's.
  const getStreak = () => {
    if (history.length === 0) return 0;
    let streakCount = 1;
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i];       // more recent
      const previous = history[i + 1];  // older
      if (current.ats_score.after >= previous.ats_score.after) {
        streakCount++;
      } else {
        break;
      }
    }
    return streakCount;
  };
  const streak = getStreak();

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Welcome back heading */}
      <div className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Welcome back, {user?.name ? user.name.split(' ')[0] : 'Developer'}
            </h1>
            {selectedTheme === 'amber' && streak > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold animate-pulse">
                <svg className="w-4.5 h-4.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.467 11.23a.75.75 0 00-.773-.393 4.298 4.298 0 01-3.666-1.815 8.358 8.358 0 00-2.842-2.736.75.75 0 00-1.042.455c-.244.68-.456 1.488-.567 2.455a5.534 5.534 0 01-2.482 4.22c-.655.44-1.2 1.054-1.583 1.777C5.875 16.48 5.75 17.7 6.133 18.847c.725 2.164 2.87 3.653 5.15 3.653h1.433c2.28 0 4.425-1.489 5.15-3.653.645-1.928.163-4.135-1.134-5.836-.615-.805-1.127-1.722-1.265-2.781z" />
                </svg>
                <span>{streak} ATS STREAK</span>
              </div>
            )}
          </div>
          <p className="font-body text-sm text-zinc-500 dark:text-white/50 mt-1">
            {repos.length} repositories analyzed · Last updated today
          </p>
        </div>
      </div>

      {/* Career Radar Widget (Violet theme exclusive) */}
      {selectedTheme === 'violet' && (
        <div className="mb-8 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-[#13111c] dark:via-[#0f0f0f] dark:to-[#171124] border border-indigo-100 dark:border-indigo-950/60 rounded-2xl p-6 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
                Career Radar
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">
                Strategist Diagnostics
              </p>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-4 h-4 border-2 border-indigo-250 border-t-indigo-600 rounded-full animate-spin"></div>
              <span className="text-xs text-zinc-500">Scanning history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs font-semibold text-zinc-650 dark:text-zinc-300">
                No Saved Analyses Yet
              </p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-sm mx-auto">
                Tailor a resume for a job description and save it to begin tracking your ATS score progress and key missing skills!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div className="p-4 bg-white/60 dark:bg-[#151322] border border-zinc-200/60 dark:border-zinc-850 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Total Saved Runs
                </span>
                <span className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-2 font-heading">
                  {history.length}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                  Analyses saved to archive
                </span>
              </div>

              <div className="p-4 bg-white/60 dark:bg-[#151322] border border-zinc-200/60 dark:border-zinc-850 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Avg. ATS Improvement
                </span>
                <span className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400 mt-2 font-heading">
                  +{history.length > 0 
                    ? Math.round(history.reduce((sum, item) => sum + (item.ats_score.after - item.ats_score.before), 0) / history.length)
                    : 0} pts
                </span>
                <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                  Tailored score vs. original
                </span>
              </div>

              <div className="p-4 bg-white/60 dark:bg-[#151322] border border-zinc-200/60 dark:border-zinc-850 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Top Missing Skills
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(() => {
                    const counts: Record<string, number> = {};
                    history.forEach(item => {
                      if (Array.isArray(item.missing_keywords)) {
                        item.missing_keywords.forEach(kw => {
                          if (kw) counts[kw.trim()] = (counts[kw.trim()] || 0) + 1;
                        });
                      }
                    });
                    const topGaps = Object.entries(counts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(e => e[0]);

                    if (topGaps.length === 0) {
                      return <span className="text-[10px] text-zinc-500 italic">No missing skills detected</span>;
                    }
                    return topGaps.map((gap, i) => (
                      <span 
                        key={i} 
                        className="text-[9px] font-bold bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-650 dark:text-indigo-450 px-2 py-0.5 rounded border border-indigo-500/20"
                      >
                        {gap}
                      </span>
                    ));
                  })()}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1.5 block font-medium">
                  Most recurring JD keyword gaps
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            GitHub Repositories
          </h2>
          <p className="font-body text-sm text-zinc-650 dark:text-white/70 mt-1">
            Select projects to include in your resume modifications during tailored exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-50 dark:bg-[#141414] border border-zinc-200 dark:border-zinc-900 focus:border-zinc-350 dark:focus:border-zinc-700 text-xs px-4 py-2 rounded-xl focus:outline-none w-full md:w-60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-500 dark:placeholder-zinc-400 transition-colors"
          />
          <button
            onClick={handleRefresh}
            disabled={loading || !user?.provider_token}
            className="border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-950 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
          >
            {loading && (
              <div className="w-3 h-3 border border-zinc-350 border-t-white rounded-full animate-spin"></div>
            )}
            Refresh Sync
          </button>
        </div>
      </div>

      {/* Codebase Analysis Status Card */}
      {analysisStatus === 'analyzing' && (
        <div className="mb-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-200 font-semibold text-xs">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-zinc-350 dark:border-zinc-800 border-t-zinc-800 dark:border-t-white rounded-full"></span>
              <span>🔍 Analyzing your GitHub projects</span>
            </div>
            <span className="text-[10px] text-zinc-550 dark:text-zinc-400 font-medium">
              This runs once and is cached for 7 days
            </span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-zinc-650 dark:text-zinc-450">
              <span>
                Processing:{' '}
                <span className="font-mono text-zinc-900 dark:text-white font-semibold">
                  {analysisProgress.currentRepo || 'Initializing'}
                </span>{' '}
                ({analysisProgress.current} of {analysisProgress.total})
              </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {Math.round(
                  (analysisProgress.current / (analysisProgress.total || 1)) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[var(--theme-accent)] h-1.5 rounded-full transition-all duration-300"
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-[var(--theme-accent-tint)] border border-[var(--theme-accent-tint)] rounded-xl gap-2 shadow-sm animate-fadeIn">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--theme-accent)]"></span>
            </span>
            <span className="text-xs font-bold text-[var(--theme-accent-text)]">
              {repos.length} repositories analyzed and ready
            </span>
            <span className="hidden sm:inline opacity-30 text-[var(--theme-accent-text)]">|</span>
            <span className="text-[10px] text-zinc-550 dark:text-zinc-400 font-medium">
              Last updated: {lastUpdatedText()}
            </span>
          </div>
          <button
            onClick={() => user?.id && reAnalyzeAllRepos(user.id)}
            className="text-[10px] font-bold text-[var(--theme-accent-text)] hover:text-[var(--theme-accent-hover)] transition-colors cursor-pointer bg-white dark:bg-zinc-900 border border-[var(--theme-accent-tint)] px-2.5 py-1 rounded-lg shadow-sm"
          >
            Re-analyze
          </button>
        </div>
      )}

      {/* Bulk Generate Banner */}
      {missingReadmeCount > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/10 dark:to-[#121212] border border-amber-200 dark:border-amber-900/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 border border-amber-250 dark:border-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm font-bold animate-pulse">
              !
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                {missingReadmeCount} projects have no README.md file
              </h4>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-450 mt-0.5">
                Generate professional READMEs for all of them in one click.
              </p>
            </div>
          </div>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkReadmeProgress !== null}
            className="text-xs text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700 bg-amber-50 dark:bg-amber-955/10 disabled:opacity-50 px-4 py-2 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-2 whitespace-nowrap self-start sm:self-center shadow-sm"
          >
            {bulkReadmeProgress !== null ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-amber-200 dark:border-amber-850 border-t-amber-600 dark:border-t-amber-400 rounded-full animate-spin"></span>
                <span>{bulkReadmeProgress}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span>Generate All Missing READMEs</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Warning if no token */}
      {!user?.provider_token && (
        <div className="p-4 mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-400 text-xs shadow-sm">
          <p className="font-semibold mb-1">GitHub Token Missing</p>
          We couldn't retrieve your GitHub access token. Please sign out and sign
          in again to authenticate with GitHub and synchronize your repositories.
        </div>
      )}

      {/* Error Info */}
      {error && (
        <div className="p-3 mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-xs shadow-sm">
          {error}
        </div>
      )}

      {/* Repos Grid */}
      {loading && repos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-[#121212] rounded-xl p-5 h-44 animate-pulse space-y-4"
            >
              <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-3 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
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
          {filteredRepos.map((repo) => {
            const isGenerating = generatingReadmeFor === repo.name;
            const isPushing = pushingReadmeFor === repo.name;

            return (
              <div
                key={repo.name}
                className="border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-[#121212] hover:border-zinc-350 dark:hover:border-zinc-800 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-sm relative"
              >
                <div>
                  {/* Repo Header */}
                  <div className="flex items-center justify-between mb-2">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-zinc-900 dark:text-white hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors flex items-center gap-1.5 group/link"
                    >
                      <span>{repo.name}</span>
                      <svg
                        className="w-3.5 h-3.5 text-zinc-600 group-hover/link:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                    </a>
                    <div className="flex items-center gap-2">
                      {/* Language Badge */}
                      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#171717] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-850">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            languageColors[repo.language || ''] || 'bg-zinc-500'
                          }`}
                        ></span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                          {repo.language || 'Other'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-zinc-550 dark:text-zinc-500 text-[11px] leading-relaxed mb-4">
                    {repo.description || 'No description provided.'}
                  </p>
                </div>

                {/* README Preview & Management Section */}
                <div className="mt-auto space-y-3">
                  <div className="bg-zinc-50 dark:bg-[#161616] border border-zinc-200 dark:border-zinc-850 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-650 tracking-wider uppercase block">
                        README Status
                      </span>
                      {/* README Status Badge */}
                      {repo.hasReadme ? (
                        <span className="bg-emerald-50 dark:bg-emerald-955/40 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30 text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          README ✓
                        </span>
                      ) : (
                        <span className="bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/30 text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          No README
                        </span>
                      )}
                    </div>
                    
                    <p className="text-zinc-655 dark:text-zinc-400 text-[10px] leading-relaxed font-mono italic">
                      {repo.readme
                        ? truncateText(repo.readme, 80)
                        : 'No README.md content available.'}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between">
                    <div></div>
                    
                    {isGenerating || isPushing ? (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-550 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-[#161616] px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850">
                        <span className="w-3 h-3 border border-zinc-350 dark:border-zinc-750 border-t-zinc-950 dark:border-t-white rounded-full animate-spin"></span>
                        <span>{isGenerating ? 'Generating...' : 'Pushing...'}</span>
                      </div>
                    ) : confirmingUpdateRepo === repo.name ? (
                      null
                    ) : repo.hasReadme ? (
                      <button
                        onClick={() => setConfirmingUpdateRepo(repo.name)}
                        className="text-[10px] font-semibold text-zinc-650 dark:text-zinc-450 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Update README
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerateReadme(repo.name)}
                        className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700 bg-amber-50 dark:bg-amber-955/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Generate README
                      </button>
                    )}
                  </div>

                  {/* Inline Confirmation */}
                  {confirmingUpdateRepo === repo.name && (
                    <div className="p-3 bg-zinc-50 dark:bg-[#161616] border border-zinc-200 dark:border-zinc-850 rounded-lg flex flex-col gap-2 animate-fadeIn">
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-normal">
                        Regenerate README from current codebase? This will overwrite the existing file on GitHub.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGenerateReadme(repo.name).then(() => setConfirmingUpdateRepo(null))}
                          className="text-[10px] font-bold text-white bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] px-3 py-1 rounded-md cursor-pointer transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingUpdateRepo(null)}
                          className="text-[10px] font-semibold text-zinc-650 dark:text-zinc-450 hover:text-zinc-955 dark:hover:text-white bg-zinc-200 dark:bg-zinc-850 hover:bg-zinc-300 dark:hover:bg-zinc-800 px-3 py-1 rounded-md cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* README Editor/Preview Modal */}
      {activeReadmeModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0f0f0f] border border-zinc-200 dark:border-zinc-850 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Markdown Editor — {activeReadmeModalRepo}
                </h2>
                <p className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-0.5">
                  Refine the AI-generated README before pushing to GitHub.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Split Panels */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Pane: Preview */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-900 flex flex-col overflow-hidden">
                <div className="bg-zinc-50 dark:bg-[#121212] px-4 py-2 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span>Live Preview</span>
                  <span className="text-[9px] text-[var(--theme-accent-text)] bg-[var(--theme-accent-tint)] border border-[var(--theme-accent-tint)] px-1.5 py-0.5 rounded">
                    Updates Live
                  </span>
                </div>
                <div className="flex-1 p-6 overflow-y-auto max-w-none text-zinc-800 dark:text-zinc-300 text-xs bg-white dark:bg-[#0b0b0b]">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 mt-2 border-b border-zinc-200 dark:border-zinc-800 pb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3 mt-4" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2 mt-3" {...props} />,
                        p: ({node, ...props}) => <p className="leading-relaxed mb-4 text-zinc-600 dark:text-zinc-400 text-xs" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-zinc-650 dark:text-zinc-400" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-zinc-650 dark:text-zinc-400" {...props} />,
                        li: ({node, ...props}) => <li className="text-zinc-655 dark:text-zinc-400" {...props} />,
                        code: ({node, className, children, ...props}) => (
                          <code className="bg-zinc-100 dark:bg-[#18181b] text-zinc-800 dark:text-zinc-205 border border-zinc-200 dark:border-zinc-850 rounded px-1.5 py-0.5 text-[11px] font-mono" {...props}>
                            {children}
                          </code>
                        ),
                        pre: ({node, ...props}) => (
                          <pre className="bg-zinc-50 dark:bg-[#141414] border border-zinc-200 dark:border-zinc-900 rounded-lg p-4 overflow-x-auto text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-4" {...props} />
                        ),
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-2 border-zinc-300 dark:border-zinc-800 pl-4 italic text-zinc-500 dark:text-zinc-500 my-4" {...props} />
                        ),
                      }}
                    >
                      {readmeContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Right Pane: Edit Textarea */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-[#121212]">
                <div className="bg-zinc-50 dark:bg-[#121212] px-4 py-2 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span>Raw Markdown Source</span>
                  {isEdited && (
                    <span className="text-[9px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/30 border border-amber-200 dark:border-amber-900/20 px-1.5 py-0.5 rounded animate-pulse font-semibold">
                      Unsaved Changes
                    </span>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-hidden relative">
                  <textarea
                    value={readmeContent}
                    onChange={(e) => {
                      setReadmeContent(e.target.value);
                      setIsEdited(true);
                    }}
                    className="w-full h-full bg-white dark:bg-[#141414] text-zinc-800 dark:text-zinc-300 font-mono text-xs p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-750 focus:outline-none resize-none focus:ring-0 leading-relaxed"
                    placeholder="Write your README markdown here..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-[#121212] flex items-center justify-between">
              <div>
                {pushingReadmeFor === activeReadmeModalRepo ? (
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-800 dark:border-t-white rounded-full animate-spin"></span>
                    Pushing to GitHub...
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyMarkdown}
                  className="border border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-950 transition-colors cursor-pointer shadow-sm"
                >
                  {copySuccess ? 'Copied ✓' : 'Copy Markdown'}
                </button>
                <button
                  onClick={handlePushToGitHub}
                  disabled={pushingReadmeFor !== null}
                  className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white disabled:opacity-50 px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {pushingReadmeFor === activeReadmeModalRepo ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[var(--theme-accent-text)] border-t-white rounded-full animate-spin"></span>
                      <span>Pushing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>Push to GitHub</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Done Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-50 dark:bg-emerald-950 border border-emerald-250 dark:border-emerald-900 text-emerald-850 dark:text-emerald-400 text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>All {repos.length} projects analyzed and ready</span>
        </div>
      )}

      {/* Bulk Toast Notification */}
      {showBulkToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-50 dark:bg-emerald-950 border border-emerald-250 dark:border-emerald-900 text-emerald-850 dark:text-emerald-400 text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>{bulkToastCount} READMEs generated and pushed ✓</span>
        </div>
      )}

      {/* Individual Push Toast Notification */}
      {showPushToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-50 dark:bg-emerald-950 border border-emerald-250 dark:border-emerald-900 text-emerald-850 dark:text-emerald-400 text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>README pushed to {pushedRepoName} ✓</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
