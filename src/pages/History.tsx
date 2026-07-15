import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useHistoryStore, type AnalysisHistory } from '../store/historyStore';
import { useNavigate } from 'react-router-dom';
import { downloadResumePDF } from '../lib/generatePDF';
import { useAppThemeStore } from '../store/themeStore';

export const History: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedTheme } = useAppThemeStore();
  const {
    analyses,
    selectedAnalysis,
    loading,
    fetchHistory,
    deleteAnalysis,
    setSelectedAnalysis,
  } = useHistoryStore();
  const navigate = useNavigate();

  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [activeTab, setActiveTab] = useState<'resume' | 'projects' | 'ats' | 'advice'>('resume');

  const getStreak = () => {
    if (analyses.length === 0) return 0;
    let streakCount = 1;
    for (let i = 0; i < analyses.length - 1; i++) {
      const current = analyses[i];       // more recent
      const previous = analyses[i + 1];  // older
      if (current.ats_score.after >= previous.ats_score.after) {
        streakCount++;
      } else {
        break;
      }
    }
    return streakCount;
  };
  const streak = getStreak();

  useEffect(() => {
    if (user?.id) {
      fetchHistory(user.id);
    }
  }, [user?.id, fetchHistory]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this analysis? This cannot be undone.')) {
      await deleteAnalysis(id);
      // Reset view on deletion if on mobile
      setMobileView('list');
    }
  };

  const handleUseAsBase = async (analysis: AnalysisHistory) => {
    // Load the tailored resume as base
    const { useResumeStore } = await import('../store/resumeStore');
    const resumeStore = useResumeStore();
    resumeStore.setResume(analysis.tailored_resume);
    await resumeStore.saveResume(user!.id);
    // Navigate to onboarding (the Resume Profile route in this app)
    navigate('/onboarding');
  };

  const handleReanalyze = (analysis: AnalysisHistory) => {
    // Navigate to analyze page with JD pre-filled
    navigate('/analyze', { state: { jdText: analysis.jd_text } });
  };

  const getAtsColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-700/30';
    if (score >= 60) return 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/30';
    return 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0f0f0f]">
        <p className="text-zinc-500 dark:text-zinc-450 text-sm animate-pulse">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-[#0f0f0f] transition-colors duration-200">
      {/* Left Sidebar - Analyses List */}
      <div
        className={`w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-white dark:bg-[#0f0f0f]
          ${mobileView === 'detail' ? 'hidden md:block' : 'block'}
        `}
      >
        <div className="sticky top-0 bg-white dark:bg-[#0f0f0f] border-b border-zinc-200 dark:border-zinc-800 p-6 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Analysis History
            </h2>
            {selectedTheme === 'amber' && streak > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold animate-pulse">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.467 11.23a.75.75 0 00-.773-.393 4.298 4.298 0 01-3.666-1.815 8.358 8.358 0 00-2.842-2.736.75.75 0 00-1.042.455c-.244.68-.456 1.488-.567 2.455a5.534 5.534 0 01-2.482 4.22c-.655.44-1.2 1.054-1.583 1.777C5.875 16.48 5.75 17.7 6.133 18.847c.725 2.164 2.87 3.653 5.15 3.653h1.433c2.28 0 4.425-1.489 5.15-3.653.645-1.928.163-4.135-1.134-5.836-.615-.805-1.127-1.722-1.265-2.781z" />
                </svg>
                <span>{streak} 🔥</span>
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {analyses.length} analyses saved
          </p>
        </div>

        {analyses.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              No analyses yet. Start by analyzing a JD.
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {analyses.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => {
                  setSelectedAnalysis(analysis);
                  setMobileView('detail');
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedAnalysis?.id === analysis.id
                    ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'
                    : 'bg-zinc-50 dark:bg-[#121212] border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-heading text-sm font-semibold truncate ${
                      selectedAnalysis?.id === analysis.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-400'
                    }`}>
                      {analysis.company_name || 'Company'}
                    </p>
                    <p className={`font-body text-xs truncate mt-0.5 ${
                      selectedAnalysis?.id === analysis.id ? 'text-zinc-500 dark:text-white/50' : 'text-zinc-400 dark:text-white/40'
                    }`}>
                      {analysis.job_title || 'Job Title'}
                    </p>
                    <p className="font-body text-[10px] text-zinc-400 dark:text-white/30 mt-1">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${getAtsColor(
                      analysis.ats_score?.after || 0
                    )}`}
                  >
                    {analysis.ats_score?.after || 0}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel - Analysis Details */}
      <div
        className={`flex-1 overflow-y-auto bg-white dark:bg-[#0f0f0f]
          ${mobileView === 'list' ? 'hidden md:block' : 'block'}
        `}
      >
        {selectedAnalysis ? (
          <div className="max-w-4xl mx-auto px-6 md:px-8 py-10">
            {/* Back button - mobile only */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white pb-6 cursor-pointer font-semibold"
            >
              ← Back to History
            </button>

            {/* Header */}
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-2">
                {selectedAnalysis.company_name}
              </h1>
              <p className="font-body text-base text-zinc-600 dark:text-white/60 mt-1">
                {selectedAnalysis.job_title}
              </p>
              <p className="font-body text-xs text-zinc-400 dark:text-white/45 mt-2">
                Analyzed on{' '}
                {new Date(selectedAnalysis.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={() => handleUseAsBase(selectedAnalysis)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                ✓ Use as Base Resume
              </button>
              <button
                onClick={() => handleReanalyze(selectedAnalysis)}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
              >
                ↻ Re-analyze with New JD
              </button>
              <button
                onClick={() => handleDelete(selectedAnalysis.id)}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                🗑 Delete
              </button>
              <button
                onClick={async () => {
                  if (!selectedAnalysis?.tailored_resume) return
                  const filename = `${selectedAnalysis.company_name}_${selectedAnalysis.job_title}_Resume.pdf`
                    .replace(/\s+/g, '_')
                  await downloadResumePDF(selectedAnalysis.tailored_resume, filename)
                }}
                className="bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-850 dark:hover:bg-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                ⬇ Download PDF
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-6 overflow-x-auto">
              {['resume', 'projects', 'ats', 'advice'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all
                    ${activeTab === tab 
                      ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white font-bold' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-450 dark:hover:text-zinc-350'}`}
                >
                  {tab === 'resume' && 'Tailored Resume'}
                  {tab === 'projects' && 'Matched Projects'}
                  {tab === 'ats' && 'ATS Score'}
                  {tab === 'advice' && 'Career Advice'}
                </button>
              ))}
            </div>

            {/* Resume Preview Tab */}
            {activeTab === 'resume' && (
              <div className="space-y-8 bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 md:p-8 shadow-sm">
                {/* Contact Info */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                    Contact Details
                  </h3>
                  <p className="text-base font-bold text-zinc-900 dark:text-white">
                    {selectedAnalysis.tailored_resume?.name}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                    {selectedAnalysis.tailored_resume?.email}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {selectedAnalysis.tailored_resume?.phone}
                  </p>
                </div>

                {/* Summary */}
                {selectedAnalysis.tailored_resume?.summary && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                      Professional Summary
                    </h3>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed text-left">
                      {selectedAnalysis.tailored_resume.summary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {((selectedAnalysis.tailored_resume?.skillCategories && selectedAnalysis.tailored_resume.skillCategories.length > 0) || 
                  (selectedAnalysis.tailored_resume?.skills && selectedAnalysis.tailored_resume.skills.length > 0)) && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                      Tailored Skills Stack
                    </h3>
                    {selectedAnalysis.tailored_resume.skillCategories && selectedAnalysis.tailored_resume.skillCategories.length > 0 ? (
                      <div className="space-y-4 pt-1">
                        {selectedAnalysis.tailored_resume.skillCategories.map((cat: any, idx: number) => (
                          <div key={idx} className="space-y-1.5 text-left">
                            <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">{cat.category}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.skills.map((s: string, sIdx: number) => (
                                <span
                                  key={sIdx}
                                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-zinc-700 dark:text-zinc-200 px-2.5 py-0.5 rounded text-xs"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAnalysis.tailored_resume.skills.map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-zinc-700 dark:text-zinc-200 px-2.5 py-0.5 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Experience */}
                {selectedAnalysis.tailored_resume?.experience?.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
                      Professional Experience
                    </h3>
                    <div className="space-y-6">
                      {selectedAnalysis.tailored_resume.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-white text-sm">
                                {exp.company}
                              </p>
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                {exp.role}
                              </p>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-450">
                              {exp.duration}
                            </p>
                          </div>
                          <ul className="space-y-1.5 list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {exp.bullets?.map((bullet: string, bidx: number) => (
                              <li key={bidx}>
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {selectedAnalysis.tailored_resume?.projects?.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
                      Optimized Repositories
                    </h3>
                    <div className="space-y-6">
                      {selectedAnalysis.tailored_resume.projects.map((proj: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">
                              {proj.name}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {proj.tech?.map((t: string, tidx: number) => (
                                <span
                                  key={tidx}
                                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-[10px] text-zinc-700 dark:text-zinc-200 px-1.5 py-0.5 rounded"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ul className="space-y-1.5 list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {proj.bullets?.map((bullet: string, bidx: number) => (
                              <li key={bidx}>
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {selectedAnalysis.tailored_resume?.education?.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
                      Education History
                    </h3>
                    <div className="space-y-4">
                      {selectedAnalysis.tailored_resume.education.map((edu: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">
                              {edu.institution}
                            </p>
                            <p className="text-zinc-650 dark:text-zinc-300 mt-0.5">
                              {edu.degree}
                            </p>
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-450">{edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements / Positions / Certifications */}
                {((selectedAnalysis.tailored_resume?.achievements && selectedAnalysis.tailored_resume.achievements.length > 0) ||
                  (selectedAnalysis.tailored_resume?.positions && selectedAnalysis.tailored_resume.positions.length > 0) ||
                  (selectedAnalysis.tailored_resume?.certifications && selectedAnalysis.tailored_resume.certifications.length > 0)) && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                      {selectedAnalysis.tailored_resume.achievements && selectedAnalysis.tailored_resume.achievements.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-5.25a1.125 1.125 0 00-1.125 1.125v3.375m9 0h-9M9 10.5V6.75m0 0l-3.75 3.75M9 6.75L12.75 10.5M9 6.75h6.75" />
                            </svg>
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Achievements</span>
                          </div>
                          <ul className="space-y-1.5">
                            {selectedAnalysis.tailored_resume.achievements.map((item: string, idx: number) => (
                              <li key={idx} className="text-[10px] text-zinc-700 dark:text-zinc-305 leading-relaxed flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedAnalysis.tailored_resume.positions && selectedAnalysis.tailored_resume.positions.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.24 0-4.364-.647-6.17-1.782v-.109a11.386 11.386 0 014.912-1.782v.109A11.386 11.386 0 0110.09 21M15 9.75a3 3 0 11-6 0 3 3 0 016 0zm-9.75 0a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Leadership</span>
                          </div>
                          <div className="space-y-2.5">
                            {selectedAnalysis.tailored_resume.positions.map((pos: any, idx: number) => (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-white leading-tight">{pos.title}</span>
                                  <span className="text-[8px] text-zinc-450 shrink-0">{pos.duration}</span>
                                </div>
                                <p className="text-[9px] text-zinc-450">{pos.organization}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedAnalysis.tailored_resume.certifications && selectedAnalysis.tailored_resume.certifications.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Certifications</span>
                          </div>
                          <div className="space-y-2.5">
                            {selectedAnalysis.tailored_resume.certifications.map((cert: any, idx: number) => (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-white leading-tight">{cert.name}</span>
                                  {cert.year && <span className="text-[8px] text-zinc-450 shrink-0">{cert.year}</span>}
                                </div>
                                <p className="text-[9px] text-zinc-455">{cert.issuer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matched Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
                  Top Matched Projects
                </h3>
                {selectedAnalysis.ranked_projects?.map((proj: any, idx: number) => (
                  <div key={idx} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-zinc-900 dark:text-white">{proj.name}</p>
                      <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        {proj.relevanceScore}% match
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{proj.reason}</p>
                  </div>
                ))}
                {(!selectedAnalysis.ranked_projects || selectedAnalysis.ranked_projects.length === 0) && (
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">No project matches stored for this run.</p>
                )}
              </div>
            )}

            {/* ATS Score Tab */}
            {activeTab === 'ats' && (
              <div className="space-y-6">
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-around mb-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 uppercase">Original</p>
                      <p className="text-5xl font-bold text-zinc-400 dark:text-zinc-300">
                        {selectedAnalysis.ats_score?.before || 0}%
                      </p>
                    </div>
                    <div className="text-3xl text-zinc-300 dark:text-zinc-700">→</div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 uppercase">Tailored</p>
                      <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedAnalysis.ats_score?.after || 0}%
                      </p>
                    </div>
                  </div>
                  
                  {selectedAnalysis.missing_keywords?.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
                      <p className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 uppercase mb-3">
                        Missing Keywords
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedAnalysis.missing_keywords.map((kw: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/35 text-red-600 dark:text-red-350 text-xs rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Career Advice Tab */}
            {activeTab === 'advice' && selectedAnalysis.career_advice && (
              <div className="space-y-6">
                {/* Action Item */}
                {selectedAnalysis.career_advice.actionItem && (
                  <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/40 rounded-xl p-5">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-2">
                      Do This Before Applying:
                    </p>
                    <p className="text-amber-800 dark:text-amber-200 font-semibold text-sm">
                      {selectedAnalysis.career_advice.actionItem}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3">
                      Core Strengths
                    </p>
                    <ul className="space-y-2">
                      {selectedAnalysis.career_advice.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                          <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">✓</span>
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-3">
                      Skill Gaps
                    </p>
                    <ul className="space-y-2">
                      {selectedAnalysis.career_advice.gaps?.map((g: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                          <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠</span>
                          <span className="leading-relaxed">{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Interview Topics */}
                {selectedAnalysis.career_advice.interviewTopics?.length > 0 && (
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                      Predicted Interview Topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.career_advice.interviewTopics.map((topic: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs rounded-lg">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Select an analysis from the list to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
