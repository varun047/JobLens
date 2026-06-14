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
import { researchCompany, type CompanyInsight } from '../lib/companyResearch';
import { useTemplateStore } from '../store/templateStore';



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

  const {
    customTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate
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

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [companyInsight, setCompanyInsight] = useState<CompanyInsight | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ResumeStyle>('modern');
  const [researchingCompany, setResearchingCompany] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Custom Template Designer States
  const [showDesignerModal, setShowDesignerModal] = useState(false);
  const [designerId, setDesignerId] = useState<string | null>(null);
  const [designerName, setDesignerName] = useState('');
  const [designerBaseStyle, setDesignerBaseStyle] = useState<'classic' | 'modern' | 'minimal' | 'two-column'>('modern');
  const [designerPrimary, setDesignerPrimary] = useState('#1a1a2e');
  const [designerSecondary, setDesignerSecondary] = useState('#555555');
  const [designerBg, setDesignerBg] = useState('#ffffff');
  const [designerText, setDesignerText] = useState('#333333');
  const [designerFontSize, setDesignerFontSize] = useState(10);
  const [designerMarginV, setDesignerMarginV] = useState(45);
  const [designerMarginH, setDesignerMarginH] = useState(50);
  const [designerAlignment, setDesignerAlignment] = useState<'left' | 'center'>('left');
  const [designerSkillsLayout, setDesignerSkillsLayout] = useState<'bullets' | 'tags'>('tags');


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

  const handleCreateCustomTemplate = () => {
    setDesignerId(null);
    setDesignerName('My Custom Layout');
    setDesignerBaseStyle('modern');
    setDesignerPrimary('#1a1a2e');
    setDesignerSecondary('#555555');
    setDesignerBg('#ffffff');
    setDesignerText('#333333');
    setDesignerFontSize(10);
    setDesignerMarginV(45);
    setDesignerMarginH(50);
    setDesignerAlignment('left');
    setDesignerSkillsLayout('tags');
    setShowDesignerModal(true);
  };

  const handleEditCustomTemplate = (id: string) => {
    const tpl = getTemplate(id);
    if (!tpl) return;
    setDesignerId(tpl.id);
    setDesignerName(tpl.name);
    setDesignerBaseStyle(tpl.baseStyle);
    setDesignerPrimary(tpl.primaryColor);
    setDesignerSecondary(tpl.secondaryColor);
    setDesignerBg(tpl.backgroundColor);
    setDesignerText(tpl.textColor);
    setDesignerFontSize(tpl.fontSizeBase);
    setDesignerMarginV(tpl.marginVertical);
    setDesignerMarginH(tpl.marginHorizontal);
    setDesignerAlignment(tpl.headerAlignment);
    setDesignerSkillsLayout(tpl.skillsLayout);
    setShowDesignerModal(true);
  };

  const handleDeleteCustomTemplate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom template?')) {
      deleteTemplate(id);
      if (selectedStyle === id) {
        setSelectedStyle('modern');
      }
      setToastMessage('✓ Template deleted');
    }
  };

  const handleSaveDesignerTemplate = () => {
    if (!designerName.trim()) {
      alert('Please enter a template name.');
      return;
    }

    const tplData = {
      name: designerName,
      baseStyle: designerBaseStyle,
      primaryColor: designerPrimary,
      secondaryColor: designerSecondary,
      backgroundColor: designerBg,
      textColor: designerText,
      fontSizeBase: designerFontSize,
      marginVertical: designerMarginV,
      marginHorizontal: designerMarginH,
      headerAlignment: designerAlignment,
      skillsLayout: designerSkillsLayout
    };

    if (designerId) {
      updateTemplate(designerId, tplData);
      setToastMessage('✓ Layout updated');
      setSelectedStyle(designerId);
    } else {
      const newTpl = addTemplate(tplData);
      setToastMessage('✓ Custom layout saved');
      setSelectedStyle(newTpl.id);
    }
    setShowDesignerModal(false);
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
    if (agentStatus === 'done') {
      setShowSaveModal(true);
      setShowConfig(false);
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

  const renderResumePreview = () => {
    if (!tailoredResume) return null;
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Contact Info Header */}
        <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
              {tailoredResume.name}
            </h3>
            <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-0.5">
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
            className="text-[10px] text-zinc-655 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2.5 py-1.5 rounded-lg bg-zinc-105 dark:bg-zinc-955 transition-all cursor-pointer shadow-sm active:scale-95"
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
              className="text-[9px] text-zinc-655 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
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
          <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
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
                <p className="text-[10px] text-zinc-600 dark:text-zinc-505 leading-relaxed">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-405">
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
            <span className="text-[10px] font-bold text-zinc-505 dark:text-zinc-400 uppercase tracking-wider">
              Work Experience Bullet Diffs
            </span>
            <button
              onClick={() =>
                copySectionToClipboard(
                  'exp',
                  formatExperienceAsText(tailoredResume.experience)
                )
              }
              className="text-[9px] text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
            >
              {copiedSection === 'exp' ? 'Copied!' : 'Copy Experience'}
            </button>
          </div>

          <div className="space-y-6">
            {tailoredResume.experience.map((exp, idx) => {
              const originalExp = baseResume.experience[idx];
              return (
                <div key={idx} className="space-y-3 border-t border-zinc-200 dark:border-zinc-900 pt-5 first:border-0 first:pt-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                        {exp.role} at {exp.company}
                      </h4>
                      <p className="text-[9px] text-zinc-500 dark:text-zinc-450">{exp.duration}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {exp.bullets.map((bullet, bulletIdx) => {
                      const origBullet = originalExp?.bullets?.[bulletIdx] || '';
                      return (
                        <div
                          key={bulletIdx}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-zinc-100/60 dark:bg-zinc-955/40 rounded-xl border border-zinc-200 dark:border-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors"
                        >
                          <div className="text-[10px] text-zinc-600 dark:text-zinc-450 italic leading-relaxed">
                            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-600 block mb-1">
                              Original Bullet
                            </span>
                            {origBullet || 'N/A'}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-900 pt-2.5 md:pt-0 md:pl-4">
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500/80 block mb-1">
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
              className="text-[9px] text-zinc-655 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
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
                            className="bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded text-[8px]"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    </h4>
                  </div>
                  <div className="space-y-2.5">
                    {proj.bullets.map((bullet, bulletIdx) => {
                      const origBullet = originalProj?.bullets?.[bulletIdx] || '';
                      return (
                        <div
                          key={bulletIdx}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-zinc-105/60 dark:bg-zinc-955/40 rounded-xl border border-zinc-200 dark:border-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors"
                        >
                          <div className="text-[10px] text-zinc-650 dark:text-zinc-450 italic leading-relaxed">
                            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-600 block mb-1">
                              Original Bullet
                            </span>
                            {origBullet || 'N/A'}
                          </div>
                          <div className="text-[10px] text-zinc-800 dark:text-zinc-200 leading-relaxed border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-900 pt-2.5 md:pt-0 md:pl-4">
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500/80 block mb-1">
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
              className="text-[9px] text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-955 transition-colors shadow-sm active:scale-95"
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
    );
  };

  const renderAtsScoreTab = () => {
    if (!atsScore) return null;
    return (
      <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 space-y-8 animate-fadeIn">
        {/* Score rings */}
        <div className="flex justify-around items-center py-6 border-b border-zinc-200 dark:border-zinc-900">
          <CircularProgress
            score={atsScore.before}
            colorClass="text-zinc-500 dark:text-zinc-600"
            label="Original ATS Score"
            size={90}
          />
          <div className="text-2xl text-zinc-400 dark:text-zinc-700 font-light">→</div>
          <CircularProgress
            score={atsScore.after}
            colorClass="text-emerald-600 dark:text-emerald-500"
            label="Tailored ATS Score"
            size={90}
          />
        </div>

        {/* Missing keyword badges */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
            Target Job Keywords Addressed
          </span>
          {missingKeywords.length === 0 ? (
            <p className="text-[11px] text-zinc-600 dark:text-zinc-500">
              Excellent! The resume rewriter did not detect any key missing terms.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {missingKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="bg-red-50 dark:bg-red-955/20 text-red-655 dark:text-red-400 border border-red-200/50 dark:border-red-900/35 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
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
          <p className="text-[10px] text-zinc-500 dark:text-zinc-550 leading-relaxed">
            Before score maps your original profile matching against the JD constraints. 
            After score estimates the improved match rate following skill reordering and target keyword injections.
          </p>
        </div>
      </div>
    );
  };

  const renderCareerAdviceTab = () => {
    if (!careerAdvice) return null;
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Action Item highlight */}
        <div className="bg-gradient-to-r from-amber-500/10 to-zinc-100 dark:to-zinc-955 border border-amber-500/20 rounded-xl p-6 space-y-1.5">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
            Do this before applying:
          </span>
          <p className="text-xs text-zinc-855 dark:text-zinc-200 leading-relaxed font-semibold">
            {careerAdvice.actionItem}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths list */}
          <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-3">
            <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
              Core Strengths
            </span>
            <ul className="space-y-2">
              {careerAdvice.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[10px] text-zinc-700 dark:text-zinc-305 leading-relaxed">
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
                <li key={idx} className="flex items-start gap-2 text-[10px] text-zinc-700 dark:text-zinc-305 leading-relaxed">
                  <span className="text-amber-500 font-bold">⚠️</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Interview Topics */}
        <div className="bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-3">
          <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider block">
            Predicted Technical Interview Topics
          </span>
          <div className="flex flex-wrap gap-2">
            {careerAdvice.interviewTopics.map((topic, idx) => (
              <span
                key={idx}
                className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 px-3 py-1 rounded-lg text-zinc-700 dark:text-zinc-305 text-[10px] font-medium"
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
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-4 transition-colors">
              {/* Job Board URL Scraper */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-505 dark:text-zinc-400 uppercase tracking-wider block">
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
                  <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">
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
                  <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">
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
                <label className="text-xs font-bold text-zinc-505 dark:text-zinc-400 uppercase tracking-wider">
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
              {showConfig ? (
                /* TABBED VIEW (Used when inputs config is visible) */
                <div className="space-y-6 animate-fadeIn">
                  {/* Tab Navigation header */}
                  <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pr-2">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab('resume')}
                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                          activeTab === 'resume'
                            ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                            : 'border-transparent text-zinc-500 dark:text-zinc-450 hover:text-zinc-750 dark:hover:text-zinc-200'
                        }`}
                      >
                        Tailored Resume
                      </button>
                      <button
                        onClick={() => setActiveTab('ats')}
                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                          activeTab === 'ats'
                            ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                            : 'border-transparent text-zinc-500 dark:text-zinc-450 hover:text-zinc-750 dark:hover:text-zinc-200'
                        }`}
                      >
                        ATS Score
                      </button>
                      <button
                        onClick={() => setActiveTab('advice')}
                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                          activeTab === 'advice'
                            ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                            : 'border-transparent text-zinc-500 dark:text-zinc-450 hover:text-zinc-750 dark:hover:text-zinc-200'
                        }`}
                      >
                        Career Advice
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSaveModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.2 rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5 active:scale-95"
                    >
                      <span>💾</span> Save
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
                    {/* ATS match details */}
                    <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-6 shadow-sm">
                      <h4 className="text-[11px] font-black text-zinc-505 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <span>📈</span> ATS Match Analysis
                      </h4>
                      {renderAtsScoreTab()}
                    </div>

                    {/* Career advice details */}
                    <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-6 shadow-sm">
                      <h4 className="text-[11px] font-black text-zinc-505 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <span>💡</span> AI Advice & Recommendations
                      </h4>
                      {renderCareerAdviceTab()}
                    </div>
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
                          className={`relative p-4 rounded-xl border text-left transition-all group ${
                            selectedStyle === style.id
                              ? 'border-white bg-zinc-800'
                              : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                          }`}
                        >
                          <div 
                            className="cursor-pointer h-full pr-6"
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

                          {/* Edit/Delete Overlay */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCustomTemplate(style.id);
                              }}
                              title="Edit Template"
                              className="p-1 hover:bg-zinc-700 text-zinc-455 hover:text-white rounded transition-colors text-[10px]"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomTemplate(style.id);
                              }}
                              title="Delete Template"
                              className="p-1 hover:bg-red-955 text-zinc-455 hover:text-red-405 rounded transition-colors text-[10px]"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Create custom button card */}
                      <button
                        type="button"
                        onClick={handleCreateCustomTemplate}
                        className="p-4 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-500 bg-zinc-950/20 hover:bg-zinc-900/40 text-center flex flex-col items-center justify-center transition-all min-h-[105px] group cursor-pointer"
                      >
                        <span className="text-xs text-zinc-450 group-hover:text-zinc-300 font-bold mb-1">+ Custom Style</span>
                        <span className="text-[9px] text-zinc-600 group-hover:text-zinc-500">Design your own layout</span>
                      </button>
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
                  Toggle which projects are used by ResumeAI to rank and rewrite bullets.
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
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Designer Modal */}
      {showDesignerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scaleUp my-8 max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-900 mb-4">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🎨</span> {designerId ? 'Edit Custom Layout' : 'Design Custom Layout'}
              </h2>
              <button 
                onClick={() => setShowDesignerModal(false)}
                className="text-zinc-450 hover:text-zinc-900 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4 scrollbar-thin">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                  Template Name
                </label>
                <input
                  type="text"
                  value={designerName}
                  onChange={(e) => setDesignerName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
                  placeholder="e.g. Tech Clean Blue"
                />
              </div>

              {/* Base Style Choice */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                  Base Style Layout
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['classic', 'modern', 'minimal', 'two-column'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDesignerBaseStyle(s)}
                      className={`py-2 px-1 rounded-lg border text-center text-[10px] font-semibold transition-all capitalize ${
                        designerBaseStyle === s
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                          : 'border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      {s.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Primary Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={designerPrimary}
                      onChange={(e) => setDesignerPrimary(e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={designerPrimary}
                      onChange={(e) => setDesignerPrimary(e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                    Secondary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={designerSecondary}
                      onChange={(e) => setDesignerSecondary(e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={designerSecondary}
                      onChange={(e) => setDesignerSecondary(e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-955 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={designerBg}
                      onChange={(e) => setDesignerBg(e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={designerBg}
                      onChange={(e) => setDesignerBg(e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Text Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={designerText}
                      onChange={(e) => setDesignerText(e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={designerText}
                      onChange={(e) => setDesignerText(e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-955 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sizing & Layout variables */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Font Size ({designerFontSize}pt)
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="14"
                    step="0.5"
                    value={designerFontSize}
                    onChange={(e) => setDesignerFontSize(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Margin V ({designerMarginV}px)
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="80"
                    step="5"
                    value={designerMarginV}
                    onChange={(e) => setDesignerMarginV(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Margin H ({designerMarginH}px)
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="80"
                    step="5"
                    value={designerMarginH}
                    onChange={(e) => setDesignerMarginH(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Header alignment and skills layout style */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Header Alignment
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['left', 'center'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setDesignerAlignment(align)}
                        className={`py-1.5 rounded-lg border text-center text-[10px] font-semibold transition-all capitalize ${
                          designerAlignment === align
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                            : 'border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                    Skills Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bullets', 'tags'] as const).map((layout) => (
                      <button
                        key={layout}
                        type="button"
                        onClick={() => setDesignerSkillsLayout(layout)}
                        className={`py-1.5 rounded-lg border text-center text-[10px] font-semibold transition-all capitalize ${
                          designerSkillsLayout === layout
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                            : 'border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                        }`}
                      >
                        {layout === 'bullets' ? 'Bullet List' : 'Inline Dot'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-900 mt-4">
              <button
                type="button"
                onClick={handleSaveDesignerTemplate}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm active:scale-95"
              >
                Save Style Layout
              </button>
              <button
                type="button"
                onClick={() => setShowDesignerModal(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
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
