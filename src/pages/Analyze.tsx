import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ParsedResume } from '../types';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useResumeStore } from '../store/resumeStore';
import { useAgentStore } from '../store/agentStore';
import { saveDraft, loadDraft, deleteDraft } from '../lib/saveDraft';
import { downloadResumePDF, type ResumeStyle } from '../lib/generatePDF';
import { extractJobFromUrl, type ExtractedJob } from '../lib/jobBoardExtractor';
import { researchCompany, type CompanyInsight } from '../lib/companyResearch';
import { useTemplateStore } from '../store/templateStore';
import { getBulletBadges } from '../lib/validateResume';



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
  const strokeWidth = 6;
  const radius = (size - strokeWidth - 4) / 2;
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

const getAtsColor = (score: number) => {
  if (score >= 80) return 'text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30';
  if (score >= 60) return 'text-amber-650 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/10 border-amber-200 dark:border-amber-900/30';
  return 'text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-955/10 border-red-200 dark:border-red-900/30';
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
    atsBreakdown,
    missingKeywords,
    careerAdvice,
    jdIntelligence,
    validationWarnings,
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

  const {
    customTemplates
  } = useTemplateStore();


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

  const wasRunning = useRef(false);

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [companyInsight, setCompanyInsight] = useState<CompanyInsight | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ResumeStyle>('modern');
  const [researchingCompany, setResearchingCompany] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Redesign state variables
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [showConfig, setShowConfig] = useState(true);

  const filteredRepos = repos.filter(repo => {
    const q = repoSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      repo.name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q))
    );
  });

  const handleDownloadPDF = async () => {
    if (!tailoredResume) return;
    setDownloadingPDF(true);
    try {
      const filename = `${selectedCompany || 'Company'}_${selectedJobTitle || 'Resume'}_Resume.pdf`
        .replace(/\s+/g, '_');
      const customConfig = customTemplates.find(t => t.id === selectedStyle);
      await downloadResumePDF(tailoredResume, filename, selectedStyle, {
        linkedin: tailoredResume.linkedin,
        github: tailoredResume.github
      }, customConfig);
      setToastMessage('✓ PDF downloaded');
    } catch (err) {
      setToastMessage('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };




  useEffect(() => {
    if (agentStatus === 'done' && selectedCompany) {
      console.log('Triggering company research for:', selectedCompany)
      setResearchingCompany(true)
      researchCompany(selectedCompany, selectedJobTitle)
        .then(insight => {
          console.log('Company insight:', insight)
          setCompanyInsight(insight)
          setSelectedStyle(insight.recommendedStyle)
          setShowStylePicker(true)
        })
        .catch(err => {
          console.error('Company research failed:', err)
          setSelectedStyle('modern')
          setShowStylePicker(true)
        })
        .finally(() => setResearchingCompany(false))
    }
  }, [agentStatus, selectedCompany, selectedJobTitle]);


  // Automatically show save modal and collapse config panel when analysis finishes
  useEffect(() => {
    if (agentStatus === 'done' && wasRunning.current) {
      setShowSaveModal(true);
      setShowConfig(false);
      wasRunning.current = false;
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
    wasRunning.current = true;
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
    wasRunning.current = true;
    
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
      setToastMessage('✓ Saved! View in History →');
      setShowSaveModal(false);
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
    'extracting',
    'step1',
    'step1_done',
    'step2a',
    'step2b',
    'step2c',
    'step2d',
    'step2_done',
    'step3',
    'step3_done'
  ].includes(agentStatus);

  const isRepoDataLoading = reposLoading || (repos.length > 0 && repoAnalyses.length === 0);

  let progressPercent = 0;
  if (agentStatus === 'extracting') progressPercent = 5;
  else if (agentStatus === 'step1') progressPercent = 15;
  else if (agentStatus === 'step1_done') progressPercent = 25;
  else if (agentStatus === 'step2a') progressPercent = 35;
  else if (agentStatus === 'step2b') progressPercent = 50;
  else if (agentStatus === 'step2c') progressPercent = 65;
  else if (agentStatus === 'step2d') progressPercent = 75;
  else if (agentStatus === 'step2_done') progressPercent = 80;
  else if (agentStatus === 'step3') progressPercent = 90;
  else if (agentStatus === 'step3_done') progressPercent = 95;
  else if (agentStatus === 'done') progressPercent = 100;

  const renderStep = (stepNum: number, label: string) => {
    let status: 'pending' | 'active' | 'done' = 'pending';
    
    if (stepNum === 1) {
      if (['step1_done', 'step2a', 'step2b', 'step2c', 'step2d', 'step2_done', 'step3', 'step3_done', 'done'].includes(agentStatus)) {
        status = 'done';
      } else if (agentStatus === 'step1') {
        status = 'active';
      }
    } else if (stepNum === 2) {
      if (['step2_done', 'step3', 'step3_done', 'done'].includes(agentStatus)) {
        status = 'done';
      } else if (['step2a', 'step2b', 'step2c', 'step2d'].includes(agentStatus)) {
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
  
  const getIssueReadableText = (issue: string) => {
    switch (issue) {
      case 'weak_verb':
        return "Passive or weak action verb";
      case 'too_short':
        return "Bullet lacks enough detail";
      case 'missing_metric':
        return "No metric or number percentage";
      case 'generic_language':
        return "Contains generic buzzwords";
      default:
        return "Needs review";
    }
  };

  const renderResumePreview = () => {
    if (!tailoredResume) return null;
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Contact Info Header */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
              {tailoredResume.name}
            </h3>
            <p className="text-[10.5px] text-zinc-500 mt-0.5">
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
            className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {copiedSection === 'contact' ? 'Copied!' : 'Copy Info'}
          </button>
        </div>

        {/* Professional Summary */}
        {tailoredResume.summary && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">
                Professional Summary
              </span>
              <button
                onClick={() => copySectionToClipboard('summary', tailoredResume.summary || '')}
                className="text-[9px] text-zinc-500 hover:text-zinc-805 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-950 transition-colors shadow-sm active:scale-95"
              >
                {copiedSection === 'summary' ? 'Copied!' : 'Copy Summary'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed text-left">
              {tailoredResume.summary}
            </p>
          </div>
        )}

        {/* Skills Grid */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-455 uppercase tracking-wider">
              Reordered Skills Stack
            </span>
            <button
              onClick={() =>
                copySectionToClipboard(
                  'skills',
                  tailoredResume.skills.join(', ')
                )
              }
              className="text-[9px] text-zinc-555 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
            >
              {copiedSection === 'skills' ? 'Copied!' : 'Copy Skills'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Left: Base Skills */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">
                Original Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {baseResume.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded text-[10px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {/* Right: Tailored Skills */}
            <div className="space-y-2 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
              <span className="text-[9px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider">
                Tailored Reordering
              </span>
              
              {tailoredResume.skillCategories && tailoredResume.skillCategories.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {tailoredResume.skillCategories.map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{cat.category}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.skills.map((s, sIdx) => {
                          const isRequired = jdIntelligence?.requiredSkills?.some(
                            (rs) => rs.toLowerCase() === s.toLowerCase()
                          );
                          return (
                            <span
                              key={sIdx}
                              className={`px-2 py-0.5 rounded text-[9.5px] border ${
                                isRequired
                                  ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30 font-semibold'
                                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-205'
                              }`}
                            >
                              {s}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tailoredResume.skills.map((s, idx) => {
                    const isRequired = jdIntelligence?.requiredSkills?.some(
                      (rs) => rs.toLowerCase() === s.toLowerCase()
                    );
                    return (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded text-[9.5px] border ${
                          isRequired
                            ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30 font-semibold'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-855 dark:text-zinc-205'
                        }`}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Targeted Repositories Selected */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 text-left">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-455 uppercase tracking-wider block">
            Targeted Repositories Selected
          </span>
          <div className="space-y-3">
            {rankedProjects.map((proj, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-155 dark:border-zinc-855 rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-905 dark:text-white">
                    {proj.name}
                  </span>
                  <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold">
                    Relevance: {proj.relevanceScore < 1 ? Math.round(proj.relevanceScore * 100) : Math.round(proj.relevanceScore)}%
                  </span>
                </div>
                <p className="text-[10px] text-zinc-550 dark:text-zinc-455 leading-relaxed">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-350">
                    Recruiter Match Logic:
                  </span>{' '}
                  {proj.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Comparison Diffs */}
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center pb-1">
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
              className="text-[9px] text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-950 transition-colors shadow-sm active:scale-95"
            >
              {copiedSection === 'exp' ? 'Copied!' : 'Copy Experience'}
            </button>
          </div>

          <div className="space-y-4">
            {tailoredResume.experience.map((exp, idx) => {
              const originalExp = baseResume.experience[idx];
              return (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xs.5 font-bold text-zinc-900 dark:text-white leading-tight">
                      {exp.role} at {exp.company}
                    </h4>
                    <p className="text-[9.5px] text-zinc-500 mt-0.5">{exp.duration}</p>
                  </div>
                  <div className="space-y-3">
                    {exp.bullets.map((bullet, bulletIdx) => {
                      const origBullet = originalExp?.bullets?.[bulletIdx] || '';
                      const bulletBadges = getBulletBadges(origBullet, bullet, jdIntelligence);

                      return (
                        <div
                          key={bulletIdx}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-850 transition-colors hover:border-zinc-350 dark:hover:border-zinc-750"
                        >
                          <div className="text-[10px] text-zinc-505 dark:text-zinc-450 italic leading-relaxed">
                            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-650 block mb-1">
                              Original Bullet
                            </span>
                            {origBullet || 'N/A'}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-2.5 md:pt-0 md:pl-4 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500/80 block mb-1">
                                Tailored Rewrite
                              </span>
                              {diffText(origBullet, bullet)}
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {bulletBadges.includes('Action verb') && (
                                <span className="bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                  </svg>
                                  Action Verb
                                </span>
                              )}
                              {bulletBadges.includes('Quantified') && (
                                <span className="bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-450 border border-blue-200/50 dark:border-blue-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                  </svg>
                                  Quantified
                                </span>
                              )}
                              {bulletBadges.includes('JD keyword') && (
                                <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-405 border border-emerald-200/50 dark:border-emerald-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m-9-9h1.5m15 0H21m-9-9a9 9 0 100 18 9 9 0 000-18z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
                                  </svg>
                                  JD Keyword
                                </span>
                              )}
                              {bulletBadges.includes('Impact') && (
                                <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-405 border border-emerald-200/50 dark:border-emerald-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.473L21 9l-3.482-3.482L9.813 15.904z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21l3.5-3.5m0 0l-3.5-3.5m3.5 3.5H3" />
                                  </svg>
                                  Impact Focused
                                </span>
                              )}
                            </div>
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
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center pb-1">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Tailored Projects Bullet Diffs
            </span>
            <button
              onClick={() =>
                copySectionToClipboard(
                  'projects',
                  formatProjectsAsText(tailoredResume.projects)
                )
              }
              className="text-[9px] text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
            >
              {copiedSection === 'projects' ? 'Copied!' : 'Copy Projects'}
            </button>
          </div>

          <div className="space-y-4">
            {tailoredResume.projects.map((proj, idx) => {
              const originalProj = baseResume.projects.find(
                (p) => p.name.toLowerCase() === proj.name.toLowerCase()
              );
              return (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs.5 font-bold text-zinc-900 dark:text-white leading-tight">
                      {proj.name}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {proj.tech.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-405 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded text-[8.5px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {proj.bullets.map((bullet, bulletIdx) => {
                      const origBullet = originalProj?.bullets?.[bulletIdx] || '';
                      const bulletBadges = getBulletBadges(origBullet, bullet, jdIntelligence);

                      return (
                        <div
                          key={bulletIdx}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-150 dark:border-zinc-850 transition-colors hover:border-zinc-350 dark:hover:border-zinc-750"
                        >
                          <div className="text-[10px] text-zinc-550 dark:text-zinc-450 italic leading-relaxed">
                            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-650 block mb-1">
                              Original Bullet
                            </span>
                            {origBullet || 'N/A'}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-2.5 md:pt-0 md:pl-4 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500/80 block mb-1">
                                Tailored Rewrite
                              </span>
                              {diffText(origBullet, bullet)}
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {bulletBadges.includes('Action verb') && (
                                <span className="bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                  </svg>
                                  Action Verb
                                </span>
                              )}
                              {bulletBadges.includes('Quantified') && (
                                <span className="bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-455 border border-blue-200/50 dark:border-blue-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                  </svg>
                                  Quantified
                                </span>
                              )}
                              {bulletBadges.includes('JD keyword') && (
                                <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-405 border border-emerald-200/50 dark:border-emerald-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m-9-9h1.5m15 0H21m-9-9a9 9 0 100 18 9 9 0 000-18z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
                                  </svg>
                                  JD Keyword
                                </span>
                              )}
                              {bulletBadges.includes('Impact') && (
                                <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-405 border border-emerald-200/50 dark:border-emerald-900/30 px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.473L21 9l-3.482-3.482L9.813 15.904z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21l3.5-3.5m0 0l-3.5-3.5m3.5 3.5H3" />
                                  </svg>
                                  Impact Focused
                                </span>
                              )}
                            </div>
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Education History
            </span>
            <button
              onClick={() =>
                copySectionToClipboard(
                  'edu',
                  tailoredResume.education
                    .map((edu) => `**${edu.institution}**\n${edu.degree} (${edu.year})`)
                    .join('\n\n')
                )
              }
              className="text-[9px] text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
            >
              {copiedSection === 'edu' ? 'Copied!' : 'Copy Edu'}
            </button>
          </div>
          <div className="space-y-3.5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {tailoredResume.education.map((edu, idx) => (
              <div key={idx} className="text-left pt-3.5 first:pt-0">
                <p className="text-xs font-semibold text-zinc-905 dark:text-white">
                  {edu.institution}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {edu.degree} —{' '}
                  <span className="text-zinc-400 dark:text-zinc-500">{edu.year}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid for Achievements, Positions, Certifications */}
        {((tailoredResume.achievements && tailoredResume.achievements.length > 0) ||
          (tailoredResume.positions && tailoredResume.positions.length > 0) ||
          (tailoredResume.certifications && tailoredResume.certifications.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Achievements Card */}
            {tailoredResume.achievements && tailoredResume.achievements.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-5.25a1.125 1.125 0 00-1.125 1.125v3.375m9 0h-9M9 10.5V6.75m0 0l-3.75 3.75M9 6.75L12.75 10.5M9 6.75h6.75" />
                  </svg>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Achievements</span>
                </div>
                <ul className="space-y-2">
                  {tailoredResume.achievements.map((item, idx) => (
                    <li key={idx} className="text-[10px] text-zinc-700 dark:text-zinc-305 leading-relaxed flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positions Card */}
            {tailoredResume.positions && tailoredResume.positions.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.24 0-4.364-.647-6.17-1.782v-.109a11.386 11.386 0 014.912-1.782v.109A11.386 11.386 0 0110.09 21M15 9.75a3 3 0 11-6 0 3 3 0 016 0zm-9.75 0a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Leadership</span>
                </div>
                <div className="space-y-3">
                  {tailoredResume.positions.map((pos, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-zinc-900 dark:text-white leading-tight">{pos.title}</span>
                        <span className="text-[8px] text-zinc-450 shrink-0 ml-2">{pos.duration}</span>
                      </div>
                      <p className="text-[9px] text-zinc-450">{pos.organization}</p>
                      <p className="text-[9.5px] text-zinc-600 dark:text-zinc-400 mt-1 leading-normal">{pos.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications Card */}
            {tailoredResume.certifications && tailoredResume.certifications.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Certifications</span>
                </div>
                <div className="space-y-3">
                  {tailoredResume.certifications.map((cert, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-zinc-900 dark:text-white leading-tight">{cert.name}</span>
                        {cert.year && <span className="text-[8px] text-zinc-450 shrink-0 ml-2">{cert.year}</span>}
                      </div>
                      <p className="text-[9px] text-zinc-455">{cert.issuer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAtsScoreTab = () => {
    if (!atsScore) return null;
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6 animate-fadeIn text-left">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-455 uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
            ATS Match Analysis
          </span>
        </div>

        {/* Score rings */}
        <div className="flex justify-around items-center py-4 border-b border-zinc-100 dark:border-zinc-800">
          <CircularProgress
            score={atsScore.before}
            colorClass="text-zinc-400 dark:text-zinc-500"
            label="Original Score"
            size={80}
          />
          <div className="text-xl text-zinc-300 dark:text-zinc-700 font-light">→</div>
          <CircularProgress
            score={atsScore.after}
            colorClass="text-emerald-500 dark:text-emerald-450"
            label="Tailored Score"
            size={80}
          />
        </div>

        {/* Score Breakdown Bars */}
        {atsBreakdown && (
          <div className="space-y-4 pt-2">
            <span className="text-[9.5px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              ATS Metric Breakdown
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Keyword Match */}
              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                <div className="flex justify-between text-[10.5px] font-semibold">
                  <span className="text-zinc-655 dark:text-zinc-350">Keyword Match</span>
                  <span className="text-zinc-850 dark:text-white">{atsBreakdown.keywordMatch}%</span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${atsBreakdown.keywordMatch}%` }}></div>
                </div>
              </div>

              {/* Bullet Quality */}
              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-955 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                <div className="flex justify-between text-[10.5px] font-semibold">
                  <span className="text-zinc-655 dark:text-zinc-350">Bullet Quality</span>
                  <span className="text-zinc-850 dark:text-white">{atsBreakdown.bulletQuality}%</span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${atsBreakdown.bulletQuality}%` }}></div>
                </div>
              </div>

              {/* Quantification */}
              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-955 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                <div className="flex justify-between text-[10.5px] font-semibold">
                  <span className="text-zinc-655 dark:text-zinc-350">Quantification</span>
                  <span className="text-zinc-850 dark:text-white">{atsBreakdown.quantification}%</span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${atsBreakdown.quantification}%` }}></div>
                </div>
              </div>

              {/* Sections Complete */}
              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-955 p-3 rounded-lg border border-zinc-155 dark:border-zinc-855">
                <div className="flex justify-between text-[10.5px] font-semibold">
                  <span className="text-zinc-655 dark:text-zinc-350">Sections Complete</span>
                  <span className="text-zinc-850 dark:text-white">{atsBreakdown.sectionsComplete}%</span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${atsBreakdown.sectionsComplete}%` }}></div>
                </div>
              </div>

              {/* Achievements Present */}
              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-955 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850 md:col-span-2">
                <div className="flex justify-between text-[10.5px] font-semibold">
                  <span className="text-zinc-655 dark:text-zinc-350">Achievements Section</span>
                  <span className="text-zinc-850 dark:text-white">{atsBreakdown.achievementsPresent}%</span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${atsBreakdown.achievementsPresent}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Missing keywords */}
        <div className="space-y-3 pt-2">
          <span className="text-[9.5px] font-bold text-zinc-405 dark:text-zinc-500 uppercase tracking-wider block">
            Target Job Keywords Addressed
          </span>
          {missingKeywords.length === 0 ? (
            <p className="text-[10.5px] text-zinc-500">
              Excellent! All target keywords have been integrated.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="bg-red-50 dark:bg-red-955/20 text-red-655 dark:text-red-400 border border-red-200/40 dark:border-red-900/30 px-2 py-0.5 rounded text-[9.5px] font-semibold"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Scoring detail note */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-lg text-[9.5px] text-zinc-500 leading-relaxed">
          <span className="font-semibold text-zinc-700 dark:text-zinc-400 block mb-0.5">Scoring Methodology</span>
          Before score maps your original profile matching against the JD constraints. 
          After score estimates the improved match rate following skill reordering and target keyword injections.
        </div>
      </div>
    );
  };

  const renderCareerAdviceTab = () => {
    if (!careerAdvice) return null;
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6 animate-fadeIn text-left">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-505 dark:text-zinc-455 uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.473L21 9l-3.482-3.482L9.813 15.904z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21l3.5-3.5m0 0l-3.5-3.5m3.5 3.5H3" />
            </svg>
            AI Advice & Recommendations
          </span>
        </div>

        {/* Action Item highlight */}
        <div className="bg-amber-50/50 dark:bg-amber-955/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 space-y-1">
          <span className="text-[9px] font-black text-amber-600 dark:text-amber-450 uppercase tracking-widest block">
            Critical Action Item:
          </span>
          <p className="text-[11px] text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold">
            {careerAdvice.actionItem}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths list */}
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl p-4 space-y-2">
            <span className="text-[9.5px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Core Strengths
            </span>
            <ul className="space-y-1.5">
              {careerAdvice.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[10px] text-zinc-700 dark:text-zinc-350 leading-normal">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps list */}
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-155 dark:border-zinc-855 rounded-xl p-4 space-y-2">
            <span className="text-[9.5px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Identified Skill Gaps
            </span>
            <ul className="space-y-1.5">
              {careerAdvice.gaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[10px] text-zinc-700 dark:text-zinc-350 leading-normal">
                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Interview Topics */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-155 dark:border-zinc-855 rounded-xl p-4 space-y-2.5">
          <span className="text-[9.5px] font-bold text-zinc-505 dark:text-zinc-400 uppercase tracking-wider block">
            Predicted Technical Interview Topics
          </span>
          <div className="flex flex-wrap gap-1.5">
            {careerAdvice.interviewTopics.map((topic, idx) => (
              <span
                key={idx}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded text-zinc-700 dark:text-zinc-305 text-[10px] font-medium shadow-xs"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`mx-auto px-6 py-10 transition-all duration-500 ${showConfig ? 'max-w-6xl' : 'max-w-[1400px]'}`}>
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

      {/* Collapsed Workspace Action Header */}
      {tailoredResume && !showConfig && (
        <div className="mb-6 p-4 bg-white/70 dark:bg-[#121212]/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-slideDown">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowConfig(true)}
              className="px-3.5 py-1.5 border border-zinc-250 dark:border-zinc-800 text-zinc-750 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-xl text-xs font-bold bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-105 dark:hover:bg-zinc-900 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>←</span> Edit Job Details
            </button>
            <div className="border-l border-zinc-200 dark:border-zinc-800 h-6 hidden sm:block" />
            <div>
              <h3 className="text-xs.5 font-black text-zinc-950 dark:text-white leading-tight">
                {selectedCompany || 'Company'} — <span className="text-zinc-550 dark:text-zinc-400 font-semibold">{selectedJobTitle || 'Job Role'}</span>
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                Workspace tailored against {selectedRepoNames.size} repositories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-black border whitespace-nowrap shadow-sm bg-zinc-50 dark:bg-zinc-900/60 ${getAtsColor(atsScore?.after || 0)}`}>
              ATS Match: {atsScore?.after || 0}%
            </span>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <span>💾</span> Save to History
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-colors hover:bg-zinc-855 dark:hover:bg-zinc-200 disabled:opacity-55 flex items-center gap-1.5 active:scale-95"
            >
              {downloadingPDF ? 'Generating...' : '⬇ Download PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CONFIG/INPUTS COLUMN */}
        {showConfig && (
          <div className="lg:col-span-5 space-y-6">
            <div className="px-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Analyze Job Description
              </h1>
              <p className="font-body text-sm text-zinc-500 dark:text-white/50 mt-1">
                Paste a JD or LinkedIn URL — our AI picks your best projects and tailors your resume.
              </p>
            </div>
            
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-4 transition-colors">
              {/* Job Board URL Scraper */}
              <div className="space-y-2">
                <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-white/40 block">
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
                    className="flex-1 bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs focus:outline-none placeholder-zinc-505 dark:placeholder-zinc-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={isRunning || extracting || !jobUrl.trim()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-sm active:scale-95"
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
                  <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-white/40 block">
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
                  <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-white/40 block">
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
                <span className="px-3 font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-450 dark:text-white/40">Or paste manually</span>
                <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>

              <div className="space-y-1">
                <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-white/40 block">
                  Job Description Text
                </label>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the target job description here..."
                  disabled={isRunning}
                  className="w-full h-60 bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 rounded-lg p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-505 dark:placeholder-zinc-400 resize-none transition-colors"
                ></textarea>
              </div>

              {/* Compact Repository Modal Trigger */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider block">
                  📂 Repositories for Context
                </label>
                <div 
                  onClick={() => !isRunning && setShowRepoModal(true)}
                  className="p-3 bg-zinc-50 dark:bg-[#161616] border border-zinc-255 dark:border-zinc-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📁</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {selectedRepoNames.size} of {repos.length} Selected
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">
                        Click to manage or search codebases
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:underline">Manage →</span>
                </div>
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
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-955 dark:bg-white text-white dark:text-[#0f0f0f] hover:bg-zinc-850 dark:hover:bg-zinc-200 active:bg-zinc-900 dark:active:bg-zinc-300 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
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
        )}

        {/* RESULTS COLUMN */}
        <div className={`${showConfig ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6`}>
          
          {/* Sibling step loader bar */}
          {agentStatus !== 'idle' && agentStatus !== 'error' && agentStatus !== 'done' && (
            <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 flex flex-col gap-6 animate-ai-glow transition-all shadow-md max-w-xl mx-auto">
              {/* File details representing the Job Description being analyzed */}
              <div className="flex items-center gap-4">
                {/* Document Icon */}
                <div className="relative w-12 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 flex items-center justify-center shadow-sm flex-shrink-0">
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-zinc-50 dark:bg-[#0f0f0f] border-b border-l border-zinc-250 dark:border-zinc-800 rounded-bl-md" />
                  <span className="absolute bottom-1 px-1 py-0.5 rounded text-[8px] font-black bg-zinc-900 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-400 border border-zinc-700/50 tracking-wider">
                    TEXT
                  </span>
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
                  <span className="text-zinc-650 dark:text-zinc-300 truncate font-semibold">
                    {statusMessage || 'Initializing...'}
                  </span>
                  <span className="text-indigo-650 dark:text-indigo-400 tabular-nums">
                    {progressPercent}%
                  </span>
                </div>

                {/* Glowing progress bar */}
                <div className="h-2 bg-zinc-150 dark:bg-zinc-900 rounded-full relative overflow-hidden border border-zinc-200/20 dark:border-zinc-900/40">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.6)] relative overflow-hidden"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-progress-shimmer" />
                  </div>
                </div>
              </div>

              {/* Sibling step indicator sub-row */}
              <div className="border-t border-zinc-150 dark:border-zinc-900/60 pt-4 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
                {renderStep(1, 'Ranking Projects')}
                <span className="text-zinc-305 dark:text-zinc-700 font-bold text-xs">→</span>
                {renderStep(2, 'Rewriting Resume')}
                <span className="text-zinc-305 dark:text-zinc-700 font-bold text-xs">→</span>
                {renderStep(3, 'Career Advice')}
              </div>
            </div>
          )}

          {/* Idle placeholder view */}
          {agentStatus === 'idle' && (
            <div className="border border-dashed border-zinc-200 dark:border-zinc-900 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-96 bg-white/20 dark:bg-black/5">
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
              <p className="text-[10px] text-zinc-500 dark:text-zinc-605 mt-1 max-w-xs leading-relaxed">
                Paste a job description on the left, check your GitHub repositories, and trigger tailoring to see results.
              </p>
            </div>
          )}

          {/* RESULTS STATE */}
          {tailoredResume && agentStatus === 'done' && (
            <div className="space-y-6">
              {/* Overall Score Comparison Header */}
              {atsScore && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-605 dark:text-emerald-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Analysis & Tailoring Complete</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Resume optimized against job requirements</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 px-4 py-2 rounded-xl">
                    <div className="text-center">
                      <span className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase block">Before</span>
                      <span className="text-sm font-black text-zinc-450 dark:text-zinc-550">{atsScore.before}%</span>
                    </div>
                    <div className="text-zinc-305 dark:text-zinc-700 text-lg font-light">→</div>
                    <div className="text-center">
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase block">After</span>
                      <span className="text-sm font-black text-emerald-605 dark:text-emerald-450">{atsScore.after}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warnings Card */}
              {validationWarnings && validationWarnings.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 border-l-4 border-l-amber-500 shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Needs Attention</span>
                    <span className="bg-amber-100 dark:bg-amber-955/40 text-amber-800 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {validationWarnings.length} Warnings
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-150 dark:divide-zinc-800/60 max-h-60 overflow-y-auto pr-1">
                    {validationWarnings.map((warn, idx) => (
                      <div key={idx} className="py-3 first:pt-0 last:pb-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            {warn.section} {warn.bulletIndex !== undefined ? `#${warn.itemIndex + 1}, bullet #${warn.bulletIndex + 1}` : `#${warn.itemIndex + 1}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-800 dark:text-zinc-200 font-semibold mt-1">
                          This bullet point is {getIssueReadableText(warn.issue)}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-0.5 leading-normal">
                          {warn.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showConfig ? (
                /* TABBED VIEW (Used when inputs config is visible) */
                <div className="space-y-6 animate-fadeIn">
                  {/* Segmented Control Navigation Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-150 dark:border-zinc-900 pr-2">
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl w-full sm:w-auto">
                      <button
                        onClick={() => setActiveTab('resume')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          activeTab === 'resume'
                            ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-905 dark:text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-205'
                        }`}
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => setActiveTab('ats')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          activeTab === 'ats'
                            ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-905 dark:text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-205'
                        }`}
                      >
                        ATS Breakdown
                      </button>
                      <button
                        onClick={() => setActiveTab('advice')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          activeTab === 'advice'
                            ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-905 dark:text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-205'
                        }`}
                      >
                        Career Advice
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSaveModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5 active:scale-95 self-end sm:self-center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5l3 3m0 0l3-3m-3 3v-6m10.125-3V17.25c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 17.25V6.75c0-.621.504-1.125 1.125-1.125h12.75c.3 0 .588.12.8.334l2.122 2.12a1.125 1.125 0 01.303.78z" />
                      </svg>
                      Save Analysis
                    </button>
                  </div>

                  {activeTab === 'resume' && renderResumePreview()}
                  {activeTab === 'ats' && renderAtsScoreTab()}
                  {activeTab === 'advice' && renderCareerAdviceTab()}
                </div>
              ) : (
                /* UNIFIED SIDE-BY-SIDE WORKSPACE (Used when inputs config is collapsed) */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Side: Resume Diffs (7 Cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-900">
                      <h4 className="text-xs font-black text-zinc-505 dark:text-zinc-450 uppercase tracking-widest flex items-center gap-2">
                        <span>📄</span> Tailored Resume Preview & Diffs
                      </h4>
                      <button
                        onClick={() => setShowConfig(true)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>✏️</span> Edit Details
                      </button>
                    </div>
                    {renderResumePreview()}
                  </div>

                  {/* Right Side: Score, Keywords, Advice & Styles (5 Cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    {renderAtsScoreTab()}
                    {renderCareerAdviceTab()}
                  </div>
                </div>
              )}

              {/* Bottom PDF download & Style Picker Section */}
              {agentStatus === 'done' && (
                <div className="mt-10 border-t border-zinc-800 pt-8">
                  <h3 className="text-lg font-bold text-white mb-2">
                    Download Your Tailored Resume
                  </h3>
                  
                  {/* Company Research Loading */}
                  {researchingCompany && (
                    <div className="flex items-center gap-3 p-4 bg-zinc-900 
                                    rounded-xl border border-zinc-800 mb-6">
                      <div className="w-4 h-4 border-2 border-emerald-500 
                                      border-t-transparent rounded-full animate-spin" />
                      <p className="text-zinc-400 text-sm">
                        Researching {selectedCompany} culture and style preferences...
                      </p>
                    </div>
                  )}
                  
                  {/* Company Insight Card */}
                  {companyInsight && !researchingCompany && (
                    <div className="p-5 bg-emerald-950/30 border border-emerald-900/50 
                                    rounded-xl mb-6">
                      <p className="text-xs font-bold text-emerald-400 uppercase 
                                    tracking-wider mb-2">
                        ★ {selectedCompany} Style Recommendation
                      </p>
                      <p className="text-emerald-200 text-sm mb-3">
                        {companyInsight.reason}
                      </p>
                      <div className="space-y-1">
                        {companyInsight.tips?.map((tip, i) => (
                          <p key={i} className="text-xs text-emerald-300 flex gap-2">
                            <span>→</span><span>{tip}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Style Picker */}
                  {(showStylePicker || !researchingCompany) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {/* Preset styles */}
                      {[
                        {
                          id: 'classic',
                          name: 'Classic',
                          desc: 'Traditional ATS-safe',
                          best: 'Banks, PSUs, Enterprise'
                        },
                        {
                          id: 'modern',
                          name: 'Modern',
                          desc: 'Clean with accent line',
                          best: 'Tech startups, SaaS'
                        },
                        {
                          id: 'minimal',
                          name: 'Minimal',
                          desc: 'Ultra clean whitespace',
                          best: 'Design, Product, Creative'
                        },
                        {
                          id: 'two-column',
                          name: 'Two Column',
                          desc: 'Sidebar + main content',
                          best: 'Technical, Engineering'
                        }
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id as ResumeStyle)}
                          className={`relative p-4 rounded-xl border text-left transition-all ${
                            selectedStyle === style.id
                              ? 'border-white bg-zinc-800'
                              : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                          }`}
                        >
                          {/* Recommended badge */}
                          {style.id === companyInsight?.recommendedStyle && (
                            <span className="absolute -top-2 -right-2 bg-emerald-600 
                                             text-white text-[10px] px-2 py-0.5 
                                             rounded-full font-bold">
                              ★ Best for {selectedCompany}
                            </span>
                          )}
                          <p className="font-bold text-white text-sm mb-1">{style.name}</p>
                          <p className="text-zinc-400 text-xs mb-2">{style.desc}</p>
                          <p className="text-zinc-650 text-[10px]">Best for: {style.best}</p>
                        </button>
                      ))}

                      {/* Custom user templates */}
                      {customTemplates.map(style => (
                        <div
                          key={style.id}
                          className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedStyle === style.id
                              ? 'border-white bg-zinc-800'
                              : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                          }`}
                          onClick={() => setSelectedStyle(style.id)}
                        >
                          <p className="font-bold text-white text-sm mb-1 truncate">{style.name}</p>
                          <p className="text-zinc-400 text-xs mb-2 truncate text-capitalize">Base: {style.baseStyle}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: style.primaryColor }} />
                            <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: style.secondaryColor }} />
                            <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: style.backgroundColor }} />
                          </div>
                        </div>
                      ))}

                      {/* Manage Styles redirect Link */}
                      <Link
                        to="/templates"
                        className="p-4 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-500 bg-zinc-950/20 hover:bg-zinc-900/40 text-center flex flex-col items-center justify-center transition-all min-h-[105px] group"
                      >
                        <span className="text-xs text-zinc-450 group-hover:text-zinc-300 font-bold mb-1">Manage Styles →</span>
                        <span className="text-[9px] text-zinc-600 group-hover:text-zinc-500">Create & edit custom templates</span>
                      </Link>
                    </div>
                  )}
                  
                  {/* Download Button */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF || !tailoredResume}
                    className="w-full md:w-auto bg-white hover:bg-zinc-200 
                               text-black font-bold px-8 py-3 rounded-xl 
                               text-sm transition-colors disabled:opacity-50
                               flex items-center gap-2"
                  >
                    {downloadingPDF
                      ? 'Generating PDF...'
                      : `⬇ Download ${
                          customTemplates.find(t => t.id === selectedStyle)?.name ||
                          (selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1))
                        } Resume PDF`
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GitHub Repository Search Modal Overlay */}
      {showRepoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scaleUp flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-900">
              <div>
                <h2 className="text-sm.5 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>📂</span> Select GitHub Repositories
                </h2>
                <p className="text-zinc-550 dark:text-zinc-500 text-[10px] mt-0.5 font-medium">
                  Toggle which projects are used by JobLens to rank and rewrite bullets.
                </p>
              </div>
              <button 
                onClick={() => setShowRepoModal(false)}
                className="text-zinc-450 hover:text-zinc-900 dark:hover:text-white text-xl font-bold cursor-pointer p-1"
              >
                ×
              </button>
            </div>

            {/* Search Bar & Helpers */}
            <div className="py-4 flex gap-2">
              <input 
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search repositories by name or description..."
                className="flex-1 bg-zinc-50 dark:bg-[#161616] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-350 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs focus:outline-none placeholder-zinc-500 dark:placeholder-zinc-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const allNames = repos.map(r => r.name);
                  setSelectedRepoNames(new Set(allNames));
                }}
                className="px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors active:scale-95"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedRepoNames(new Set())}
                className="px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors active:scale-95"
              >
                None
              </button>
            </div>

            {/* Repo List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
              {reposLoading ? (
                <div className="py-12 text-center text-zinc-505 text-xs animate-pulse">
                  Loading repositories...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No repositories found matching "{repoSearch}"
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <div
                    key={repo.name}
                    onClick={() => toggleRepoSelected(repo.name)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedRepoNames.has(repo.name)
                        ? 'bg-emerald-50/10 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-900/60 shadow-sm'
                        : 'bg-zinc-50 dark:bg-[#181818]/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRepoNames.has(repo.name)}
                        readOnly
                        className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-955 text-emerald-600 focus:ring-0 focus:ring-offset-0 pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {repo.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-0.5 leading-relaxed">
                          {repo.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 flex justify-end">
              <button
                onClick={() => setShowRepoModal(false)}
                className="bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] px-5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors hover:bg-zinc-850 dark:hover:bg-zinc-200 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                  className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-250 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
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
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-755 dark:text-zinc-200 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
   
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-emerald-650 dark:text-emerald-400 px-4.5 py-3 rounded-xl shadow-2xl flex items-center gap-3.5 z-50 text-xs font-semibold animate-slideUp">
          <span className="text-sm">✓</span>
          <span>{toastMessage}</span>
          {toastMessage.includes('Saved') && (
            <button
              onClick={() => {
                navigate('/history');
                setToastMessage(null);
              }}
              className="ml-2 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              View History
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Analyze;
