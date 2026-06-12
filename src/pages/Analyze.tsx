import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ParsedResume } from '../types';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useResumeStore } from '../store/resumeStore';
import { useAgentStore } from '../store/agentStore';

const diffText = (oldText: string, newText: string) => {
  if (!oldText) {
    return <span className="text-emerald-400">{newText}</span>;
  }
  const oldWords = new Set(oldText.toLowerCase().split(/\W+/).filter(Boolean));
  const newWords = newText.split(/(\W+)/);
  const commonStopwords = [
    'and',
    'the',
    'a',
    'to',
    'of',
    'in',
    'for',
    'with',
    'on',
    'at',
    'by',
    'an',
    'is',
    'are',
    'was',
    'were',
    'it',
    'its',
    'as',
    'from',
    'that',
    'this',
  ];

  return newWords.map((part, idx) => {
    const isWord = /\w+/.test(part);
    if (isWord) {
      const cleanWord = part.toLowerCase();
      if (!oldWords.has(cleanWord) && !commonStopwords.includes(cleanWord)) {
        return (
          <span
            key={idx}
            className="text-emerald-400 font-semibold bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-900/30 text-[11px]"
          >
            {part}
          </span>
        );
      }
    }
    return <span key={idx}>{part}</span>;
  });
};

const CircularProgress = ({
  score,
  colorClass,
  size = 100,
  label,
}: {
  score: number;
  colorClass: string;
  size?: number;
  label: string;
}) => {
  const radius = 45;
  const strokeWidth = 6;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
        {label}
      </span>
      <div className="relative" style={{ width: size, height: size }}>
        <svg height={size} width={size} className="transform -rotate-90">
          <circle
            className="text-zinc-900 stroke-current"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`${colorClass} stroke-current transition-all duration-700`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}%</span>
        </div>
      </div>
    </div>
  );
};

export const Analyze: React.FC = () => {
  const { user } = useAuthStore();
  const { repos, loading: reposLoading, fetchRepos } = useRepoStore();
  const {
    resume: baseResume,
    loading: resumeLoading,
    fetchResume,
  } = useResumeStore();
  const {
    jdText,
    rankedProjects,
    tailoredResume,
    atsScore,
    missingKeywords,
    careerAdvice,
    agentStatus,
    error: agentError,
    setJdText,
    runAgent,
    resetAgent,
  } = useAgentStore();

  const [selectedRepoNames, setSelectedRepoNames] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState<'resume' | 'ats' | 'advice'>(
    'resume'
  );
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Reset agent store state on component unmount
  useEffect(() => {
    return () => {
      resetAgent();
    };
  }, [resetAgent]);

  // Sync state and fetch if needed
  useEffect(() => {
    if (user?.id) {
      fetchResume(user.id);
    }
  }, [user?.id, fetchResume]);

  useEffect(() => {
    if (user?.provider_token && repos.length === 0) {
      fetchRepos(user.provider_token);
    }
  }, [user?.provider_token, repos.length, fetchRepos]);

  // Select all repositories by default once they are loaded
  useEffect(() => {
    if (repos.length > 0 && selectedRepoNames.size === 0) {
      setSelectedRepoNames(new Set(repos.map((r) => r.name)));
    }
  }, [repos]);

  const toggleRepoSelected = (repoName: string) => {
    const updated = new Set(selectedRepoNames);
    if (updated.has(repoName)) {
      updated.delete(repoName);
    } else {
      updated.add(repoName);
    }
    setSelectedRepoNames(updated);
  };

  const handleRunAnalysis = async () => {
    if (!baseResume) return;
    const selectedRepos = repos.filter((r) => selectedRepoNames.has(r.name));
    await runAgent(selectedRepos, baseResume);
    setActiveTab('resume');
  };

  const copySectionToClipboard = (sectionName: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatExperienceAsText = (exp: ParsedResume['experience']) => {
    return exp
      .map(
        (e) =>
          `**${e.company}**\n${e.role} | ${e.duration}\n${e.bullets
            .map((b) => `- ${b}`)
            .join('\n')}`
      )
      .join('\n\n');
  };

  const formatProjectsAsText = (proj: ParsedResume['projects']) => {
    return proj
      .map(
        (p) =>
          `**${p.name}** (${p.tech.join(', ')})\n${p.bullets
            .map((b) => `- ${b}`)
            .join('\n')}`
      )
      .join('\n\n');
  };

  // Handle loading state
  if (resumeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no base resume is uploaded, prompt the user to upload one first
  if (!baseResume) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center mb-4 text-zinc-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white mb-2">Resume Profile Required</h2>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          You need to import and review your base resume profile before running the AI agent tailor analysis.
        </p>
        <Link
          to="/onboarding"
          className="bg-white text-[#0f0f0f] hover:bg-zinc-200 text-xs px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg"
        >
          Setup Resume Profile
        </Link>
      </div>
    );
  }

  const isRunning =
    agentStatus === 'step1' ||
    agentStatus === 'step2' ||
    agentStatus === 'step3';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Step Progress Indicator Bar (Visible when running or done) */}
      {agentStatus !== 'idle' && (
        <div className="mb-8 bg-[#121212] border border-zinc-900 rounded-xl p-4 flex items-center justify-center gap-6 text-[10px] font-semibold tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                agentStatus === 'step1'
                  ? 'bg-blue-400 animate-pulse'
                  : agentStatus === 'step2' ||
                    agentStatus === 'step3' ||
                    agentStatus === 'done'
                  ? 'bg-emerald-500'
                  : 'bg-zinc-700'
              }`}
            ></span>
            <span
              className={
                agentStatus === 'step1'
                  ? 'text-white'
                  : agentStatus === 'step2' ||
                    agentStatus === 'step3' ||
                    agentStatus === 'done'
                  ? 'text-emerald-500'
                  : 'text-zinc-500'
              }
            >
              1. Rank Projects
            </span>
          </div>
          <span className="text-zinc-750">→</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                agentStatus === 'step2'
                  ? 'bg-blue-400 animate-pulse'
                  : agentStatus === 'step3' || agentStatus === 'done'
                  ? 'bg-emerald-500'
                  : 'bg-zinc-700'
              }`}
            ></span>
            <span
              className={
                agentStatus === 'step2'
                  ? 'text-white'
                  : agentStatus === 'step3' || agentStatus === 'done'
                  ? 'text-emerald-500'
                  : 'text-zinc-500'
              }
            >
              2. Tailor Resume
            </span>
          </div>
          <span className="text-zinc-750">→</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                agentStatus === 'step3'
                  ? 'bg-blue-400 animate-pulse'
                  : agentStatus === 'done'
                  ? 'bg-emerald-500'
                  : 'bg-zinc-700'
              }`}
            ></span>
            <span
              className={
                agentStatus === 'step3'
                  ? 'text-white'
                  : agentStatus === 'done'
                  ? 'text-emerald-500'
                  : 'text-zinc-500'
              }
            >
              3. Career Coach
            </span>
          </div>
        </div>
      )}

      {/* Main Two Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Input Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121212] border border-zinc-900 rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Job Description
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the target job description here..."
                disabled={isRunning}
                className="w-full h-60 bg-[#161616] border border-zinc-850 focus:border-zinc-750 rounded-lg p-3 text-xs text-zinc-350 focus:outline-none resize-none"
              ></textarea>
            </div>

            {/* Repository override selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-400">
                  GitHub Repositories
                </span>
                <span className="text-[10px] text-zinc-500">
                  {selectedRepoNames.size} of {repos.length} selected
                </span>
              </div>

              {reposLoading ? (
                <div className="py-8 text-center text-zinc-500 text-xs animate-pulse">
                  Syncing repositories...
                </div>
              ) : repos.length === 0 ? (
                <div className="p-4 bg-zinc-950/20 border border-zinc-900 text-center rounded-lg text-[10px] text-zinc-500">
                  No repositories synced. Go to dashboard to import.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 border border-zinc-850 rounded-lg p-2 bg-[#161616]">
                  {repos.map((repo) => (
                    <div
                      key={repo.name}
                      onClick={() => !isRunning && toggleRepoSelected(repo.name)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedRepoNames.has(repo.name)
                          ? 'bg-zinc-900 border-zinc-800'
                          : 'bg-[#181818]/20 border-transparent hover:border-zinc-900'
                      } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRepoNames.has(repo.name)}
                          readOnly
                          className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-white truncate">
                            {repo.name}
                          </p>
                          <p className="text-[9px] text-zinc-500 truncate">
                            {repo.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {agentError && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-xs leading-relaxed">
                {agentError}
              </div>
            )}

            <button
              onClick={handleRunAnalysis}
              disabled={isRunning || !jdText.trim() || repos.length === 0}
              className="w-full py-2 px-4 rounded-lg bg-white text-[#0f0f0f] hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-800 border-t-zinc-250 rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Analyze & Tailor'
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Results Details */}
        <div className="lg:col-span-7">
          {/* Running loading overlay */}
          {isRunning && (
            <div className="bg-[#121212] border border-zinc-900 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 h-96">
              <div className="w-10 h-10 border-2 border-zinc-800 border-t-zinc-300 rounded-full animate-spin"></div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white animate-pulse">
                  {agentStatus === 'step1'
                    ? 'Step 1/3 — Analyzing your GitHub projects...'
                    : agentStatus === 'step2'
                    ? 'Step 2/3 — Rewriting experience bullets...'
                    : 'Step 3/3 — Preparing custom career advice...'}
                </h3>
                <p className="text-[10px] text-zinc-500">
                  Llama agent is tailoring the resume content. Please stand by.
                </p>
              </div>
            </div>
          )}

          {/* Idle placeholder view */}
          {agentStatus === 'idle' && (
            <div className="border border-dashed border-zinc-900 rounded-xl p-12 text-center flex flex-col items-center justify-center h-96">
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
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <h3 className="text-xs font-semibold text-zinc-400">
                Awaiting Analysis
              </h3>
              <p className="text-[10px] text-zinc-600 mt-1 max-w-xs leading-relaxed">
                Paste a job description on the left, check your GitHub repositories, and trigger tailoring to see results.
              </p>
            </div>
          )}

          {/* Done State: Show Tab Results */}
          {agentStatus === 'done' && tailoredResume && (
            <div className="space-y-6 animate-fadeIn">
              {/* Tab Navigation header */}
              <div className="flex border-b border-zinc-900">
                <button
                  onClick={() => setActiveTab('resume')}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'resume'
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  Tailored Resume
                </button>
                <button
                  onClick={() => setActiveTab('ats')}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'ats'
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  ATS Score
                </button>
                <button
                  onClick={() => setActiveTab('advice')}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'advice'
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  Career Advice
                </button>
              </div>

              {/* TAB 1: TAILORED RESUME PREVIEW & DIFFS */}
              {activeTab === 'resume' && (
                <div className="space-y-6">
                  {/* Contact Info Header */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {tailoredResume.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {tailoredResume.email} | {tailoredResume.phone}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copySectionToClipboard(
                          'contact',
                          `${tailoredResume.name}\n${tailoredResume.email} | ${tailoredResume.phone}`
                        )
                      }
                      className="text-[10px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg bg-zinc-950 transition-all cursor-pointer"
                    >
                      {copiedSection === 'contact' ? 'Copied!' : 'Copy Info'}
                    </button>
                  </div>

                  {/* Skills Grid */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Reordered Skills Stack
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'skills',
                            tailoredResume.skills.join(', ')
                          )
                        }
                        className="text-[9px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded bg-zinc-950 transition-colors"
                      >
                        {copiedSection === 'skills' ? 'Copied!' : 'Copy Skills'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left: Base Skills */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-650 uppercase">
                          Original Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {baseResume.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-zinc-950 border border-zinc-900 text-zinc-450 px-2 py-0.5 rounded text-[10px]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Right: Tailored Skills */}
                      <div className="space-y-1 border-l border-zinc-900 pl-4">
                        <span className="text-[9px] font-bold text-zinc-650 uppercase">
                          Tailored Reordering
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tailoredResume.skills.map((s, idx) => {
                            const isNew = !baseResume.skills.some(
                              (bs) => bs.toLowerCase() === s.toLowerCase()
                            );
                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] border ${
                                  isNew
                                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30 font-semibold'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                                }`}
                              >
                                {s}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ranked projects chosen and why */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Targeted Repositories Selected
                    </span>
                    <div className="space-y-3">
                      {rankedProjects.map((proj, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              {proj.name}
                            </span>
                            <span className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                              Relevance: {proj.relevanceScore}%
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            <span className="font-semibold text-zinc-400">
                              Recruiter Match Logic:
                            </span>{' '}
                            {proj.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Experience Comparison Diffs */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Work Experience Bullet Diffs
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'exp',
                            formatExperienceAsText(tailoredResume.experience)
                          )
                        }
                        className="text-[9px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded bg-zinc-950 transition-colors"
                      >
                        {copiedSection === 'exp' ? 'Copied!' : 'Copy Experience'}
                      </button>
                    </div>

                    <div className="space-y-6">
                      {tailoredResume.experience.map((exp, idx) => {
                        const originalExp = baseResume.experience[idx];
                        return (
                          <div key={idx} className="space-y-3 border-t border-zinc-900 pt-5 first:border-0 first:pt-0">
                            <div>
                              <h4 className="text-xs font-bold text-white">
                                {exp.role} at {exp.company}
                              </h4>
                              <p className="text-[9px] text-zinc-500">{exp.duration}</p>
                            </div>
                            <div className="space-y-2">
                              {exp.bullets.map((bullet, bulletIdx) => {
                                const origBullet = originalExp?.bullets?.[bulletIdx] || '';
                                return (
                                  <div
                                    key={bulletIdx}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-zinc-950/40 rounded-lg border border-zinc-900"
                                  >
                                    <div className="text-[10px] text-zinc-550 italic leading-relaxed">
                                      <span className="text-[9px] font-semibold text-zinc-650 block mb-0.5">
                                        Original Bullet
                                      </span>
                                      {origBullet || 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-900 pt-2 md:pt-0 md:pl-3">
                                      <span className="text-[9px] font-semibold text-emerald-500/80 block mb-0.5">
                                        Tailored Rewrite
                                      </span>
                                      {diffText(origBullet, bullet)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tailored Projects Section Diffs */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Tailored Projects Bullet Diffs
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'projects',
                            formatProjectsAsText(tailoredResume.projects)
                          )
                        }
                        className="text-[9px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded bg-zinc-950 transition-colors"
                      >
                        {copiedSection === 'projects' ? 'Copied!' : 'Copy Projects'}
                      </button>
                    </div>

                    <div className="space-y-6">
                      {tailoredResume.projects.map((proj, idx) => {
                        const originalProj = baseResume.projects.find(
                          (p) => p.name.toLowerCase() === proj.name.toLowerCase()
                        );
                        return (
                          <div key={idx} className="space-y-3 border-t border-zinc-900 pt-5 first:border-0 first:pt-0">
                            <div>
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                {proj.name}
                                <span className="flex gap-1">
                                  {proj.tech.map((t, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="bg-zinc-900 text-zinc-400 border border-zinc-800 px-1 py-0.5 rounded text-[8px]"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </span>
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {proj.bullets.map((bullet, bulletIdx) => {
                                const origBullet = originalProj?.bullets?.[bulletIdx] || '';
                                return (
                                  <div
                                    key={bulletIdx}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-zinc-950/40 rounded-lg border border-zinc-900"
                                  >
                                    <div className="text-[10px] text-zinc-550 italic leading-relaxed">
                                      <span className="text-[9px] font-semibold text-zinc-650 block mb-0.5">
                                        Original Bullet
                                      </span>
                                      {origBullet || 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-900 pt-2 md:pt-0 md:pl-3">
                                      <span className="text-[9px] font-semibold text-emerald-500/80 block mb-0.5">
                                        Tailored Rewrite
                                      </span>
                                      {diffText(origBullet, bullet)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Education Display */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Education History
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'edu',
                            tailoredResume.education
                              .map(
                                (edu) =>
                                  `**${edu.institution}**\n${edu.degree} (${edu.year})`
                              )
                              .join('\n\n')
                          )
                        }
                        className="text-[9px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded bg-zinc-950 transition-colors"
                      >
                        {copiedSection === 'edu' ? 'Copied!' : 'Copy Edu'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {tailoredResume.education.map((edu, idx) => (
                        <div key={idx} className="text-left">
                          <p className="text-xs font-semibold text-white">
                            {edu.institution}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {edu.degree} —{' '}
                            <span className="text-zinc-500">{edu.year}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATS SCORE & MISSING KEYWORDS */}
              {activeTab === 'ats' && atsScore && (
                <div className="bg-[#121212] border border-zinc-900 rounded-xl p-6 space-y-8">
                  {/* Score rings */}
                  <div className="flex justify-around items-center py-6 border-b border-zinc-900">
                    <CircularProgress
                      score={atsScore.before}
                      colorClass="text-zinc-650"
                      label="Original ATS Score"
                    />
                    <div className="text-2xl text-zinc-750 font-light">→</div>
                    <CircularProgress
                      score={atsScore.after}
                      colorClass="text-emerald-500"
                      label="Tailored ATS Score"
                    />
                  </div>

                  {/* Missing keyword badges */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Target Job Keywords Addressed
                    </span>
                    {missingKeywords.length === 0 ? (
                      <p className="text-[11px] text-zinc-500">
                        Excellent! The resume rewriter did not detect any key missing terms.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {missingKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="bg-red-950/20 text-red-400 border border-red-900/35 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scoring detail note */}
                  <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
                    <h5 className="text-xs font-semibold text-white mb-1">
                      Scoring Methodology
                    </h5>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Before score maps your original profile matching against the JD constraints. 
                      After score estimates the improved match rate following skill reordering and target keyword injections.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: CAREER ADVICE */}
              {activeTab === 'advice' && careerAdvice && (
                <div className="space-y-6">
                  {/* Action Item highlight */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-zinc-950 border border-amber-500/20 rounded-xl p-6 space-y-1.5">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
                      Do this before applying:
                    </span>
                    <p className="text-xs text-zinc-200 leading-relaxed font-semibold">
                      {careerAdvice.actionItem}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths list */}
                    <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Core Strengths
                      </span>
                      <ul className="space-y-2">
                        {careerAdvice.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[10px] text-zinc-300 leading-relaxed">
                            <span className="text-emerald-500 font-bold">✓</span>
                            {str}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Gaps list */}
                    <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Identified Skill Gaps
                      </span>
                      <ul className="space-y-2">
                        {careerAdvice.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[10px] text-zinc-300 leading-relaxed">
                            <span className="text-amber-500 font-bold">⚠️</span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Interview Topics */}
                  <div className="bg-[#121212] border border-zinc-900 rounded-xl p-5 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Predicted Technical Interview Topics
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {careerAdvice.interviewTopics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-950 border border-zinc-900 px-3 py-1 rounded-lg text-zinc-300 text-[10px] font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyze;
