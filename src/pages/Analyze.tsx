import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ParsedResume } from '../types';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useResumeStore } from '../store/resumeStore';
import { useAgentStore } from '../store/agentStore';
import { saveDraft, loadDraft, deleteDraft } from '../lib/saveDraft';
import { downloadResumePDF, type ResumeStyle } from '../lib/generatePDF';
import { extractJobFromUrl, type ExtractedJob } from '../lib/jobBoardExtractor';
import { StylePicker } from '../components/StylePicker';
import { researchCompany, type CompanyInsight } from '../lib/companyResearch';

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
            className="text-zinc-200 dark:text-zinc-900 stroke-current"
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
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{score}%</span>
        </div>
      </div>
    </div>
  );
};

export const Analyze: React.FC = () => {
  const { user } = useAuthStore();
  const { repos, loading: reposLoading, fetchRepos, repoAnalyses, analyzeAllRepos } = useRepoStore();
  const {
    resume: baseResume,
    loading: resumeLoading,
    fetchResume,
  } = useResumeStore();
  const {
    jdText,
    jobUrl,
    selectedCompany,
    selectedJobTitle,
    rankedProjects,
    tailoredResume,
    atsScore,
    missingKeywords,
    careerAdvice,
    agentStatus,
    statusMessage,
    error: agentError,
    setJdText,
    setJobUrl,
    setSelectedCompany,
    setSelectedJobTitle,
    runAgent,
    clearAnalysis,
    setStep1Result,
    setStep2Result,
    setStep3Result,
  } = useAgentStore();

  const navigate = useNavigate();
  const [selectedRepoNames, setSelectedRepoNames] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState<'resume' | 'ats' | 'advice'>(
    'resume'
  );
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Job Board URL Scraper & Metadata States
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedJob, setExtractedJob] = useState<ExtractedJob | null>(null);

  // Recovery Modal, Save Modal & Toast States
  const [showDraftModal, setShowDraftModal] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCompany, setSaveCompany] = useState('');
  const [saveJobTitle, setSaveJobTitle] = useState('');
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [companyInsight, setCompanyInsight] = useState<CompanyInsight | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ResumeStyle>('modern');
  const [researchingCompany, setResearchingCompany] = useState(false);

  const handleDownloadPDF = async () => {
    if (!tailoredResume) return;
    setDownloadingPDF(true);
    try {
      const filename = `${selectedCompany || 'Company'}_${selectedJobTitle || 'Resume'}_Resume.pdf`
        .replace(/\s+/g, '_');
      await downloadResumePDF(tailoredResume, filename, selectedStyle, {
        linkedin: tailoredResume.linkedin,
        github: tailoredResume.github
      });
      setToastMessage('✓ PDF downloaded');
    } catch (err) {
      setToastMessage('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    if (agentStatus === 'done') {
      if (selectedCompany) {
        setResearchingCompany(true);
        researchCompany(selectedCompany, selectedJobTitle)
          .then(insight => {
            setCompanyInsight(insight);
            setSelectedStyle(insight.recommendedStyle);
          })
          .catch((err) => {
            console.error('Failed to research company:', err);
            setSelectedStyle('modern');
          })
          .finally(() => setResearchingCompany(false));
      } else {
        setCompanyInsight(null);
        setSelectedStyle('modern');
      }
    }
  }, [agentStatus, selectedCompany, selectedJobTitle]);

  // Automatically show save modal when analysis finishes
  useEffect(() => {
    if (agentStatus === 'done') {
      setShowSaveModal(true);
    }
  }, [agentStatus]);

  // Recover from draft on page load
  useEffect(() => {
    if (user?.id) {
      loadDraft(user.id).then((draft) => {
        if (draft) {
          setShowDraftModal(draft);
        }
      });
    }
  }, [user?.id]);

  // Supabase Draft Auto-save Effects
  useEffect(() => {
    if (rankedProjects.length > 0 && user?.id) {
      saveDraft(user.id, {
        jdText,
        company: selectedCompany,
        jobTitle: selectedJobTitle,
        rankedProjects,
        tailoredResume: null,
        atsScore: { before: 0, after: 0 },
        careerAdvice: null,
        stepCompleted: 1,
      });
    }
  }, [rankedProjects, user?.id, jdText, selectedCompany, selectedJobTitle]);

  useEffect(() => {
    if (tailoredResume && user?.id) {
      saveDraft(user.id, {
        jdText,
        company: selectedCompany,
        jobTitle: selectedJobTitle,
        rankedProjects,
        tailoredResume,
        atsScore: atsScore || { before: 0, after: 0 },
        careerAdvice: null,
        stepCompleted: 2,
      });
    }
  }, [tailoredResume, user?.id, jdText, selectedCompany, selectedJobTitle, rankedProjects, atsScore]);

  useEffect(() => {
    if (careerAdvice && user?.id) {
      saveDraft(user.id, {
        jdText,
        company: selectedCompany,
        jobTitle: selectedJobTitle,
        rankedProjects,
        tailoredResume,
        atsScore: atsScore || { before: 0, after: 0 },
        careerAdvice,
        stepCompleted: 3,
      });
    }
  }, [careerAdvice, user?.id, jdText, selectedCompany, selectedJobTitle, rankedProjects, tailoredResume, atsScore]);

  // Toast auto-fade
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Save modal initialization
  useEffect(() => {
    if (showSaveModal) {
      setSaveCompany(selectedCompany || 'Company');
      setSaveJobTitle(selectedJobTitle || 'Job Opening');
    }
  }, [showSaveModal, selectedCompany, selectedJobTitle]);

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

  // Automatically load repo analyses from Supabase if needed
  useEffect(() => {
    if (user?.id && repos.length > 0 && repoAnalyses.length === 0) {
      analyzeAllRepos(user.id);
    }
  }, [user?.id, repos.length, repoAnalyses.length, analyzeAllRepos]);

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

  const handleExtract = async () => {
    if (!jobUrl.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const job = await extractJobFromUrl(jobUrl);
      setExtractedJob(job);
      setJdText(job.description);
      if (job.company) setSelectedCompany(job.company);
      if (job.title) setSelectedJobTitle(job.title);
      setJobUrl('');
    } catch (err: any) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!baseResume) return;
    if (!repoAnalyses || repoAnalyses.length === 0) {
      alert('Your GitHub repositories are still being analyzed. Please wait or refresh the page.');
      return;
    }
    const selectedRepos = repos.filter((r) => selectedRepoNames.has(r.name));
    await runAgent(
      selectedRepos,
      baseResume,
      selectedJobTitle || 'Untitled Role',
      selectedCompany || 'Unknown Company',
      user?.id
    );
    setActiveTab('resume');
  };

  const handleResume = async (draft: any) => {
    setJdText(draft.jd_text || '');
    setSelectedCompany(draft.company_name || '');
    setSelectedJobTitle(draft.job_title || '');
    
    if (draft.step_completed >= 1) {
      setStep1Result(draft.ranked_projects || []);
    }
    if (draft.step_completed >= 2) {
      setStep2Result(draft.tailored_resume || null, draft.ats_score || { before: 0, after: 0 }, []);
    }
    if (draft.step_completed >= 3) {
      setStep3Result(draft.career_advice || null);
    }
    
    setShowDraftModal(null);

    if (draft.step_completed === 1 || draft.step_completed === 2) {
      if (baseResume) {
        let currentSelectedRepoNames = selectedRepoNames;
        if (currentSelectedRepoNames.size === 0 && repos.length > 0) {
          currentSelectedRepoNames = new Set(repos.map((r) => r.name));
          setSelectedRepoNames(currentSelectedRepoNames);
        }
        const selectedRepos = repos.filter((r) => currentSelectedRepoNames.has(r.name));
        await runAgent(
          selectedRepos,
          baseResume,
          draft.job_title || 'Untitled Role',
          draft.company_name || 'Unknown Company',
          user?.id,
          draft.step_completed + 1
        );
        setActiveTab('resume');
      }
    } else if (draft.step_completed === 3) {
      useAgentStore.setState({ agentStatus: 'done', statusMessage: '✓ Analysis complete — scroll down to see results' });
    }
  };

  const handleStartOver = async () => {
    if (user?.id) {
      await deleteDraft(user.id);
    }
    clearAnalysis();
    setShowDraftModal(null);
  };

  const handleSaveAnalysis = async (company: string, jobTitle: string) => {
    if (!user?.id) return;
    setSavingAnalysis(true);
    try {
      const { useHistoryStore } = await import('../store/historyStore');
      await useHistoryStore.getState().saveAnalysis(user.id, {
        company_name: company || 'Company',
        job_title: jobTitle || 'Job Opening',
        jd_text: jdText,
        ranked_projects: rankedProjects,
        tailored_resume: tailoredResume!,
        ats_score: atsScore || { before: 0, after: 0 },
        missing_keywords: missingKeywords,
        career_advice: careerAdvice!,
      });

      await deleteDraft(user.id);
      clearAnalysis();
      setToastMessage('✓ Analysis saved to history');
      setShowSaveModal(false);
      navigate('/history');
    } catch (err) {
      console.error('Failed to save analysis:', err);
      alert('Error saving analysis');
    } finally {
      setSavingAnalysis(false);
    }
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

  const isRunning = [
    'step1',
    'step1_done',
    'step2a',
    'step2a_done',
    'step2b',
    'step2b_done',
    'step3',
    'step3_done'
  ].includes(agentStatus);

  const isRepoDataLoading = reposLoading || (repos.length > 0 && repoAnalyses.length === 0);

  let progressPercent = 0;
  if (['step1_done', 'step2a'].includes(agentStatus)) progressPercent = 25;
  else if (['step2a_done', 'step2b'].includes(agentStatus)) progressPercent = 50;
  else if (['step2b_done', 'step3'].includes(agentStatus)) progressPercent = 75;
  else if (['step3_done', 'done'].includes(agentStatus)) progressPercent = 100;
  else if (agentStatus === 'step1') progressPercent = 10;

  const renderStep = (stepNum: number, label: string) => {
    let status: 'pending' | 'active' | 'done' = 'pending';
    
    if (stepNum === 1) {
      if (['step1_done', 'step2a', 'step2a_done', 'step2b', 'step2b_done', 'step3', 'step3_done', 'done'].includes(agentStatus)) {
        status = 'done';
      } else if (agentStatus === 'step1') {
        status = 'active';
      }
    } else if (stepNum === 2) {
      if (['step2b_done', 'step3', 'step3_done', 'done'].includes(agentStatus)) {
        status = 'done';
      } else if (['step2a', 'step2a_done', 'step2b'].includes(agentStatus)) {
        status = 'active';
      }
    } else if (stepNum === 3) {
      if (['step3_done', 'done'].includes(agentStatus)) {
        status = 'done';
      } else if (agentStatus === 'step3') {
        status = 'active';
      }
    }

    if (status === 'done') {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold flex items-center gap-1">
            {label} <span className="font-bold">✓</span>
          </span>
        </div>
      );
    }

    if (status === 'active') {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
          <span className="text-zinc-900 dark:text-white text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 animate-pulse">
            {label}
            <div className="w-2.5 h-2.5 border border-zinc-800/20 dark:border-white/20 border-t-zinc-850 dark:border-t-white rounded-full animate-spin"></div>
          </span>
        </div>
      );
    }

    // Pending
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
        <span className="text-zinc-450 dark:text-zinc-500 text-[10px] sm:text-xs font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Thin Progress Bar at very top of page */}
      <div 
        className="fixed top-0 left-0 h-0.5 bg-emerald-500 z-[9999] transition-all duration-500 ease-out" 
        style={{ width: `${progressPercent}%` }}
      />

      {/* Phase 0 Codebase Reading Banner */}
      {reposLoading && (
        <div className="mb-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 flex items-center justify-center gap-3 text-xs text-zinc-650 dark:text-zinc-400">
          <div className="w-3.5 h-3.5 border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
          <span>
            Reading your codebase{repos.length > 0 ? ` across ${repos.length} repos` : ''}...
          </span>
        </div>
      )}

      {/* Main Two Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Input Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 space-y-4 transition-colors">
            {/* Job Board URL Scraper */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                📋 Paste Job URL (LinkedIn / Indeed / Any)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                  placeholder="https://linkedin.com/jobs/view/... or indeed.com/..."
                  disabled={isRunning || extracting}
                  className="flex-1 bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs focus:outline-none placeholder-zinc-500 dark:placeholder-zinc-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={isRunning || extracting || !jobUrl.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                >
                  {extracting ? 'Extracting...' : 'Extract JD'}
                </button>
              </div>

              {extractError && (
                <div className="p-3 bg-red-955/20 border border-red-900/30 rounded-lg text-red-400 text-xs">
                  {extractError}
                </div>
              )}

              {extractedJob && !extractError && (
                <div className="p-3 bg-emerald-955/20 border border-emerald-900/30 rounded-lg text-emerald-400 text-xs">
                  ✓ Extracted from {extractedJob.source}
                  {extractedJob.title && ` — ${extractedJob.title}`}
                  {extractedJob.company && ` at ${extractedJob.company}`}
                </div>
              )}
            </div>

            {/* Job Metadata details */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                  Job Title
                </label>
                <input
                  type="text"
                  value={selectedJobTitle}
                  onChange={(e) => setSelectedJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  disabled={isRunning}
                  className="w-full bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs focus:outline-none placeholder-zinc-500 dark:placeholder-zinc-400 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  placeholder="e.g. Google"
                  disabled={isRunning}
                  className="w-full bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs focus:outline-none placeholder-zinc-500 dark:placeholder-zinc-400 transition-colors"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center py-2">
              <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="px-3 text-[10px] uppercase font-bold text-zinc-450 dark:text-zinc-550 tracking-wider">Or paste manually</span>
              <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Job Description Text
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the target job description here..."
                disabled={isRunning}
                className="w-full h-60 bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 rounded-lg p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-500 dark:placeholder-zinc-400 resize-none transition-colors"
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
                <div className="p-4 bg-zinc-100 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-900 text-center rounded-lg text-[10px] text-zinc-500">
                  No repositories synced. Go to dashboard to import.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 border border-zinc-200 dark:border-zinc-850 rounded-lg p-2 bg-zinc-50 dark:bg-[#161616]">
                  {repos.map((repo) => (
                    <div
                      key={repo.name}
                      onClick={() => !isRunning && toggleRepoSelected(repo.name)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedRepoNames.has(repo.name)
                          ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800'
                          : 'bg-white dark:bg-[#181818]/20 border-zinc-200 dark:border-transparent hover:border-zinc-350 dark:hover:border-zinc-900'
                      } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRepoNames.has(repo.name)}
                          readOnly
                          className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-955 text-emerald-600 focus:ring-0 focus:ring-offset-0 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                            {repo.name}
                          </p>
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-450 truncate">
                            {repo.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(!repoAnalyses || repoAnalyses.length === 0) && (
              <div className="p-3 bg-amber-50 dark:bg-amber-955/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
                ⚠️ Codebase pre-analysis is not loaded. Please go to the <strong><Link to="/" className="underline text-amber-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-300">Dashboard</Link></strong> to complete project pre-analysis first.
              </div>
            )}

            {agentError && (
              <div className="p-3 bg-red-50 dark:bg-red-955/10 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-xs leading-relaxed">
                {agentError}
              </div>
            )}

            <button
              onClick={handleRunAnalysis}
              disabled={isRunning || !jdText.trim() || repos.length === 0 || repoAnalyses.length === 0}
              className="w-full py-2 px-4 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] hover:bg-zinc-855 dark:hover:bg-zinc-200 active:bg-zinc-900 dark:active:bg-zinc-300 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-950 dark:border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Analyze & Tailor'
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Results Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Phase 1, 2, 3 Agent Status Bar */}
          {agentStatus !== 'idle' && agentStatus !== 'error' && (
            <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 flex flex-col gap-6 animate-ai-glow transition-all shadow-md max-w-xl mx-auto">
              
              {/* File details representing the Job Description being analyzed */}
              <div className="flex items-center gap-4">
                {/* Document Icon */}
                <div className="relative w-12 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 flex items-center justify-center shadow-sm flex-shrink-0">
                  {/* File shape corner notch */}
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-zinc-50 dark:bg-[#0f0f0f] border-b border-l border-zinc-250 dark:border-zinc-800 rounded-bl-md" />
                  {/* File type badge */}
                  <span className="absolute bottom-1 px-1 py-0.5 rounded text-[8px] font-black bg-zinc-900 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-400 border border-zinc-700/50 tracking-wider">
                    TEXT
                  </span>
                  {/* Mini lines representing text inside file */}
                  <div className="flex flex-col gap-1 w-6 -mt-1.5 opacity-60">
                    <div className="w-5 h-0.5 bg-zinc-400 dark:bg-zinc-500 rounded" />
                    <div className="w-6 h-0.5 bg-zinc-400 dark:bg-zinc-500 rounded" />
                    <div className="w-4 h-0.5 bg-zinc-400 dark:bg-zinc-500 rounded" />
                  </div>
                </div>

                {/* File Metadata */}
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-xs.5 font-bold text-zinc-900 dark:text-white truncate">
                    {selectedCompany ? `${selectedCompany}_JobDescription.txt` : 'Target_JobDescription.txt'}
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">
                    {jdText ? `${(jdText.length / 1024).toFixed(2)} KB` : '4.50 KB'}
                  </p>
                </div>
                
                {/* Circular pulsing loading ring */}
                <div className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-900/60 flex items-center justify-center animate-spin">
                  <div className="w-4 h-4 border-2 border-transparent border-t-indigo-500 dark:border-t-indigo-400 rounded-full" />
                </div>
              </div>

              {/* Progress and status message */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-zinc-650 dark:text-zinc-300 truncate">
                    {statusMessage || 'Initializing...'}
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {progressPercent}%
                  </span>
                </div>

                {/* Glowing progress bar */}
                <div className="h-2 bg-zinc-150 dark:bg-zinc-900 rounded-full relative overflow-hidden border border-zinc-200/20 dark:border-zinc-900/40">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.6)] relative overflow-hidden"
                    style={{ width: `${progressPercent}%` }}
                  >
                    {/* Linear shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-progress-shimmer" />
                  </div>
                </div>
              </div>

              {/* Sibling step indicator sub-row */}
              <div className="border-t border-zinc-150 dark:border-zinc-900/60 pt-4 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
                {renderStep(1, 'Ranking Projects')}
                <span className="text-zinc-300 dark:text-zinc-700 font-bold text-xs">→</span>
                {renderStep(2, 'Rewriting Resume')}
                <span className="text-zinc-300 dark:text-zinc-700 font-bold text-xs">→</span>
                {renderStep(3, 'Career Advice')}
              </div>
            </div>
          )}

          {/* Idle placeholder view */}
          {agentStatus === 'idle' && (
            <div className="border border-dashed border-zinc-200 dark:border-zinc-900 rounded-xl p-12 text-center flex flex-col items-center justify-center h-96">
              <svg
                className="w-10 h-10 text-zinc-400 dark:text-zinc-650 mb-3"
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
              <h3 className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">
                Awaiting Analysis
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1 max-w-xs leading-relaxed">
                Paste a job description on the left, check your GitHub repositories, and trigger tailoring to see results.
              </p>
            </div>
          )}

          {/* Done State: Show Tab Results (Fades in smoothly) */}
          {tailoredResume && (
            <div className={`space-y-6 transition-all duration-700 ${agentStatus === 'done' ? 'opacity-100 translate-y-0' : 'opacity-0 h-0 overflow-hidden pointer-events-none'}`}>
              {/* Style Picker */}
              <StylePicker
                company={selectedCompany || 'Company'}
                jobTitle={selectedJobTitle || 'Job Opening'}
                selectedStyle={selectedStyle}
                onStyleSelected={setSelectedStyle}
                companyInsight={companyInsight}
                researchingCompany={researchingCompany}
                onGenerate={handleDownloadPDF}
                generating={downloadingPDF}
              />

              {/* Tab Navigation header */}
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pr-2">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('resume')}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'resume'
                        ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                        : 'border-transparent text-zinc-500 dark:text-zinc-455 hover:text-zinc-750 dark:hover:text-zinc-200'
                    }`}
                  >
                    Tailored Resume
                  </button>
                  <button
                    onClick={() => setActiveTab('ats')}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'ats'
                        ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                        : 'border-transparent text-zinc-500 dark:text-zinc-455 hover:text-zinc-750 dark:hover:text-zinc-200'
                    }`}
                  >
                    ATS Score
                  </button>
                  <button
                    onClick={() => setActiveTab('advice')}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'advice'
                        ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                        : 'border-transparent text-zinc-500 dark:text-zinc-455 hover:text-zinc-750 dark:hover:text-zinc-200'
                    }`}
                  >
                    Career Advice
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>💾</span> Save to History
                </button>
              </div>

              {/* TAB 1: TAILORED RESUME PREVIEW & DIFFS */}
              {activeTab === 'resume' && (
                <div className="space-y-6">
                  {/* Contact Info Header */}
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                        {tailoredResume.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-450 mt-0.5">
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
                      className="text-[10px] text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-955 transition-all cursor-pointer"
                    >
                      {copiedSection === 'contact' ? 'Copied!' : 'Copy Info'}
                    </button>
                  </div>

                  {/* Skills Grid */}
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                        Reordered Skills Stack
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'skills',
                            tailoredResume.skills.join(', ')
                          )
                        }
                        className="text-[9px] text-zinc-655 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors"
                      >
                        {copiedSection === 'skills' ? 'Copied!' : 'Copy Skills'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left: Base Skills */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-650 uppercase">
                          Original Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {baseResume.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-zinc-100 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-900 text-zinc-600 dark:text-zinc-450 px-2 py-0.5 rounded text-[10px]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Right: Tailored Skills */}
                      <div className="space-y-1 border-l border-zinc-200 dark:border-zinc-900 pl-4">
                        <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-650 uppercase">
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
                                    ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 font-semibold'
                                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200'
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
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4">
                    <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block">
                      Targeted Repositories Selected
                    </span>
                    <div className="space-y-3">
                      {rankedProjects.map((proj, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-zinc-100 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                              {proj.name}
                            </span>
                            <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                              Relevance: {proj.relevanceScore < 1 ? Math.round(proj.relevanceScore * 100) : Math.round(proj.relevanceScore)}%
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-500 leading-relaxed">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-400">
                              Recruiter Match Logic:
                            </span>{' '}
                            {proj.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Experience Comparison Diffs */}
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Work Experience Bullet Diffs
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'exp',
                            formatExperienceAsText(tailoredResume.experience)
                          )
                        }
                        className="text-[9px] text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors"
                      >
                        {copiedSection === 'exp' ? 'Copied!' : 'Copy Experience'}
                      </button>
                    </div>

                    <div className="space-y-6">
                      {tailoredResume.experience.map((exp, idx) => {
                        const originalExp = baseResume.experience[idx];
                        return (
                          <div key={idx} className="space-y-3 border-t border-zinc-200 dark:border-zinc-900 pt-5 first:border-0 first:pt-0">
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                                {exp.role} at {exp.company}
                              </h4>
                              <p className="text-[9px] text-zinc-500 dark:text-zinc-450">{exp.duration}</p>
                            </div>
                            <div className="space-y-2">
                              {exp.bullets.map((bullet, bulletIdx) => {
                                const origBullet = originalExp?.bullets?.[bulletIdx] || '';
                                return (
                                  <div
                                    key={bulletIdx}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-zinc-100/60 dark:bg-zinc-955/40 rounded-lg border border-zinc-200 dark:border-zinc-900"
                                  >
                                    <div className="text-[10px] text-zinc-600 dark:text-zinc-550 italic leading-relaxed">
                                      <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-650 block mb-0.5">
                                        Original Bullet
                                      </span>
                                      {origBullet || 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-zinc-800 dark:text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-900 pt-2 md:pt-0 md:pl-3">
                                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500/80 block mb-0.5">
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
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
                        Tailored Projects Bullet Diffs
                      </span>
                      <button
                        onClick={() =>
                          copySectionToClipboard(
                            'projects',
                            formatProjectsAsText(tailoredResume.projects)
                          )
                        }
                        className="text-[9px] text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors"
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
                          <div key={idx} className="space-y-3 border-t border-zinc-200 dark:border-zinc-900 pt-5 first:border-0 first:pt-0">
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                {proj.name}
                                <span className="flex gap-1">
                                  {proj.tech.map((t, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 rounded text-[8px]"
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
                                    className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-zinc-100/60 dark:bg-zinc-955/40 rounded-lg border border-zinc-200 dark:border-zinc-900"
                                  >
                                    <div className="text-[10px] text-zinc-600 dark:text-zinc-550 italic leading-relaxed">
                                      <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-650 block mb-0.5">
                                        Original Bullet
                                      </span>
                                      {origBullet || 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-zinc-800 dark:text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-900 pt-2 md:pt-0 md:pl-3">
                                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500/80 block mb-0.5">
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
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">
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
                        className="text-[9px] text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors"
                      >
                        {copiedSection === 'edu' ? 'Copied!' : 'Copy Edu'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {tailoredResume.education.map((edu, idx) => (
                        <div key={idx} className="text-left">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {edu.institution}
                          </p>
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                            {edu.degree} —{' '}
                            <span className="text-zinc-500 dark:text-zinc-500">{edu.year}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATS SCORE & MISSING KEYWORDS */}
              {activeTab === 'ats' && atsScore && (
                <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 space-y-8">
                  {/* Score rings */}
                  <div className="flex justify-around items-center py-6 border-b border-zinc-200 dark:border-zinc-900">
                    <CircularProgress
                      score={atsScore.before}
                      colorClass="text-zinc-500 dark:text-zinc-650"
                      label="Original ATS Score"
                    />
                    <div className="text-2xl text-zinc-400 dark:text-zinc-755 font-light">→</div>
                    <CircularProgress
                      score={atsScore.after}
                      colorClass="text-emerald-600 dark:text-emerald-500"
                      label="Tailored ATS Score"
                    />
                  </div>

                  {/* Missing keyword badges */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block">
                      Target Job Keywords Addressed
                    </span>
                    {missingKeywords.length === 0 ? (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-550">
                        Excellent! The resume rewriter did not detect any key missing terms.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {missingKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="bg-red-50 dark:bg-red-955/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/35 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scoring detail note */}
                  <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-4 rounded-xl">
                    <h5 className="text-xs font-semibold text-zinc-900 dark:text-white mb-1">
                      Scoring Methodology
                    </h5>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed">
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
                  <div className="bg-gradient-to-r from-amber-500/10 to-zinc-100 dark:to-zinc-955 border border-amber-500/20 rounded-xl p-6 space-y-1.5">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
                      Do this before applying:
                    </span>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold">
                      {careerAdvice.actionItem}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths list */}
                    <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block">
                        Core Strengths
                      </span>
                      <ul className="space-y-2">
                        {careerAdvice.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[10px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <span className="text-emerald-500 font-bold">✓</span>
                            {str}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Gaps list */}
                    <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
                        Identified Skill Gaps
                      </span>
                      <ul className="space-y-2">
                        {careerAdvice.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[10px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <span className="text-amber-500 font-bold">⚠️</span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Interview Topics */}
                  <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block">
                      Predicted Technical Interview Topics
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {careerAdvice.interviewTopics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 px-3 py-1 rounded-lg text-zinc-700 dark:text-zinc-300 text-[10px] font-medium"
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

      {/* Recovery Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl animate-scaleUp">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
              <span>💾</span> Resume Analysis in Progress
            </h2>
            <p className="text-zinc-500 dark:text-zinc-450 text-xs mb-4">
              We found unsaved analysis progress from {new Date(showDraftModal.last_saved_at).toLocaleDateString()} at {new Date(showDraftModal.last_saved_at).toLocaleTimeString()}.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded-lg p-4 mb-4 text-xs text-zinc-650 dark:text-zinc-350 space-y-1.5">
              <p><strong>Company:</strong> {showDraftModal.company_name || 'N/A'}</p>
              <p><strong>Role:</strong> {showDraftModal.job_title || 'N/A'}</p>
              <p><strong>Progress:</strong> {showDraftModal.step_completed}/3 steps completed</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleResume(showDraftModal)}
                disabled={isRepoDataLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {isRepoDataLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin"></div>
                    Loading Data...
                  </>
                ) : (
                  'Resume Analysis'
                )}
              </button>
              <button
                onClick={handleStartOver}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save to History Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl animate-scaleUp">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
              <span>💾</span> Save Analysis to History
            </h2>
            <p className="text-zinc-500 dark:text-zinc-450 text-xs mb-4">
              Save this tailored analysis so you can track it in your Analytics Dashboard.
            </p>

            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Company Name
                </label>
                <input
                  type="text"
                  value={saveCompany}
                  onChange={(e) => setSaveCompany(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Job Title
                </label>
                <input
                  type="text"
                  value={saveJobTitle}
                  onChange={(e) => setSaveJobTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSaveAnalysis(saveCompany, saveJobTitle)}
                disabled={!saveCompany.trim() || !saveJobTitle.trim() || savingAnalysis}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-sm"
              >
                {savingAnalysis ? 'Saving...' : 'Confirm & Save'}
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-200 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-emerald-600 dark:text-emerald-400 px-4.5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-semibold animate-slideUp">
          <span className="text-sm">✓</span> {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Analyze;
