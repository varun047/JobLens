import React, { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useHistoryStore } from '../store/historyStore'
import { downloadResumePDF } from '../lib/generatePDF'
import { useNavigate } from 'react-router-dom'

export const Resumes: React.FC = () => {
  const { user } = useAuthStore()
  const { analyses, fetchHistory, deleteAnalysis } = useHistoryStore()
  const navigate = useNavigate()

  // Filter/Sort state
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterAts, setFilterAts] = useState<[number, number]>([0, 100])
  const [sortBy, setSortBy] = useState<'recent' | 'ats_high' | 'ats_low' | 'company'>('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedResume, setSelectedResume] = useState<any>(null)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) fetchHistory(user.id)
  }, [user?.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu')) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Extract unique role categories from job titles
  const roleCategories = useMemo(() => {
    const roles = new Set<string>()
    analyses.forEach(a => {
      const firstWord = a.job_title?.split(' ')[0]
      if (firstWord) roles.add(firstWord)
    })
    return Array.from(roles)
  }, [analyses])

  // Filter and sort analyses
  const filteredResumes = useMemo(() => {
    let result = [...analyses]

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.company_name?.toLowerCase().includes(q) ||
        a.job_title?.toLowerCase().includes(q)
      )
    }

    // Role filter
    if (filterRole !== 'all') {
      result = result.filter(a =>
        a.job_title?.toLowerCase().startsWith(filterRole.toLowerCase())
      )
    }

    // ATS filter
    result = result.filter(a => {
      const score = a.ats_score?.after || 0
      return score >= filterAts[0] && score <= filterAts[1]
    })

    // Sort
    switch (sortBy) {
      case 'ats_high':
        result.sort((a, b) => (b.ats_score?.after || 0) - (a.ats_score?.after || 0))
        break
      case 'ats_low':
        result.sort((a, b) => (a.ats_score?.after || 0) - (b.ats_score?.after || 0))
        break
      case 'company':
        result.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
        break
      case 'recent':
      default:
        result.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }

    return result
  }, [analyses, search, filterRole, filterAts, sortBy])

  const getAtsColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
    if (score >= 60) return 'text-amber-400 bg-amber-950/20 border-amber-900/30'
    return 'text-red-400 bg-red-950/20 border-red-900/30'
  }

  const handleUseAsBase = async (analysis: any) => {
    const { useResumeStore } = await import('../store/resumeStore')
    const resumeStore = useResumeStore.getState()
    resumeStore.setResume(analysis.tailored_resume)
    await resumeStore.saveResume(user!.id)
    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center 
                        justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Resume Library
            </h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-sm mt-1">
              {filteredResumes.length} of {analyses.length} resumes
            </p>
          </div>

          {/* View toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-700'
                  : 'text-zinc-500 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-700'
                  : 'text-zinc-500 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              ≡ List
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 
                        bg-zinc-50 dark:bg-zinc-900/50 
                        border border-zinc-200 dark:border-zinc-800 
                        rounded-xl">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or role..."
            className="flex-1 min-w-48 bg-white dark:bg-[#121212] 
                       border border-zinc-250 dark:border-zinc-800 
                       rounded-lg px-3 py-2 text-sm 
                       text-zinc-900 dark:text-zinc-200
                       focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
          />

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-white dark:bg-[#121212] border border-zinc-250 
                       dark:border-zinc-800 rounded-lg px-3 py-2 text-sm 
                       text-zinc-900 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Roles</option>
            {roleCategories.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-[#121212] border border-zinc-250 
                       dark:border-zinc-800 rounded-lg px-3 py-2 text-sm 
                       text-zinc-900 dark:text-zinc-200 focus:outline-none"
          >
            <option value="recent">Most Recent</option>
            <option value="ats_high">Highest ATS</option>
            <option value="ats_low">Lowest ATS</option>
            <option value="company">Company A-Z</option>
          </select>

          {/* ATS Range */}
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>ATS:</span>
            <input
              type="number"
              value={filterAts[0]}
              onChange={(e) => setFilterAts([Number(e.target.value), filterAts[1]])}
              className="w-14 bg-white dark:bg-[#121212] border border-zinc-250 
                         dark:border-zinc-800 rounded px-2 py-1 text-sm text-center
                         text-zinc-900 dark:text-zinc-200 focus:outline-none"
              min={0} max={100}
            />
            <span>–</span>
            <input
              type="number"
              value={filterAts[1]}
              onChange={(e) => setFilterAts([filterAts[0], Number(e.target.value)])}
              className="w-14 bg-white dark:bg-[#121212] border border-zinc-250 
                         dark:border-zinc-800 rounded px-2 py-1 text-sm text-center
                         text-zinc-900 dark:text-zinc-200 focus:outline-none"
              min={0} max={100}
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredResumes.length === 0 && (
          <div className="text-center py-24">
            <p className="text-zinc-400 dark:text-zinc-500 text-lg mb-2">
              No resumes found
            </p>
            <p className="text-zinc-500 dark:text-zinc-650 text-sm">
              {analyses.length === 0
                ? 'Analyze a JD to create your first tailored resume'
                : 'Try adjusting your filters'}
            </p>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredResumes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResumes.map((analysis) => (
              <div
                key={analysis.id}
                className="relative h-64 overflow-visible group cursor-pointer card-hover-z-index"
              >
                {/* Folder Back Flap */}
                <div className="absolute inset-x-0 bottom-0 top-12 bg-zinc-800 dark:bg-zinc-900 border border-zinc-700/30 dark:border-zinc-850 rounded-2xl shadow-md z-0 transition-transform duration-300">
                  {/* Folder Back tab curve */}
                  <div className="absolute -top-3 left-4 w-20 h-3 bg-zinc-800 dark:bg-zinc-900 border-t border-x border-zinc-700/30 dark:border-zinc-850 rounded-t-md" />
                </div>

                {/* Left Page (fans out and moves up on hover) */}
                <div className="w-[58%] h-[74%] absolute bottom-10 left-5 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-300/30 dark:border-zinc-700/40 transform -rotate-3 transition-all duration-500 origin-bottom group-hover:-translate-y-14 group-hover:-rotate-12 group-hover:scale-105 z-10 flex flex-col p-2 space-y-1">
                  <div className="w-8 h-1 bg-zinc-300 dark:bg-zinc-650 rounded mb-1" />
                  <div className="w-12 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="w-10 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="w-8 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>

                {/* Right Page (fans out and moves up on hover) */}
                <div className="w-[58%] h-[74%] absolute bottom-10 right-5 bg-zinc-50 dark:bg-zinc-850 rounded-lg shadow-sm border border-zinc-300/30 dark:border-zinc-700/40 transform rotate-3 transition-all duration-500 origin-bottom group-hover:-translate-y-14 group-hover:rotate-12 group-hover:scale-105 z-10 flex flex-col p-2 space-y-1">
                  <div className="w-8 h-1 bg-zinc-300 dark:bg-zinc-650 rounded mb-1 self-end" />
                  <div className="w-10 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="w-12 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="w-6 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>

                {/* Center Page (main paper preview, slides up straight) */}
                <div className="w-[66%] h-[82%] absolute bottom-10 left-[17%] bg-white dark:bg-zinc-950 rounded-lg shadow-lg border border-zinc-300/60 dark:border-zinc-800/80 transition-all duration-500 transform group-hover:-translate-y-18 group-hover:scale-105 z-15 flex flex-col p-3 space-y-1.5 overflow-hidden">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[7px] font-black">
                      ✓
                    </div>
                    <div className="w-16 h-1 bg-zinc-300 dark:bg-zinc-650 rounded" />
                  </div>
                  <div className="w-full h-0.5 bg-zinc-150 dark:bg-zinc-900 rounded" />
                  <div className="w-[85%] h-0.5 bg-zinc-150 dark:bg-zinc-900 rounded" />
                  <div className="w-[90%] h-0.5 bg-zinc-150 dark:bg-zinc-900 rounded" />
                  <div className="pt-1 space-y-1">
                    <div className="w-10 h-0.5 bg-emerald-500/30 dark:bg-emerald-400/20 rounded" />
                    <div className="w-[75%] h-0.5 bg-zinc-150 dark:bg-zinc-900 rounded" />
                  </div>
                  <div className="w-[70%] h-0.5 bg-zinc-150 dark:bg-zinc-900 rounded" />
                </div>

                {/* Folder Front Flap (Glassmorphic Cover) */}
                <div className="absolute bottom-0 left-0 right-0 h-[142px] bg-white/70 dark:bg-[#121212]/75 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-b-2xl rounded-tr-2xl rounded-tl-md z-20 transition-all duration-300 p-4 flex flex-col justify-between shadow-md">
                  {/* Neumorphic front folder tab edge */}
                  <div className="absolute -top-3.5 left-0 w-24 h-4 bg-white/70 dark:bg-[#121212]/75 border-t border-x border-zinc-200/50 dark:border-zinc-800/50 rounded-t-lg backdrop-blur-md" />

                  {/* Metadata inside front flap */}
                  <div className="flex items-start justify-between relative z-30">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white truncate">
                        {analysis.company_name}
                      </h3>
                      <p className="font-body text-sm text-zinc-500 dark:text-white/55 truncate mt-0.5">
                        {analysis.job_title}
                      </p>
                      <p className="font-body text-[11px] text-zinc-400 dark:text-white/30 mt-1.5">
                        {new Date(analysis.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border whitespace-nowrap shadow-sm ${getAtsColor(analysis.ats_score?.after || 0)}`}>
                      {analysis.ats_score?.after || 0}%
                    </span>
                  </div>

                  {/* Hover Actions (Fade and slide up on hover) */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 relative z-30 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-2.5">
                    <button
                      onClick={() => setSelectedResume(analysis)}
                      className="flex-1 text-[10px] font-extrabold px-2 py-1.5 rounded-lg cursor-pointer
                                 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
                                 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-250 dark:border-zinc-700/50 transition-colors shadow-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={async () => {
                        const filename = `${analysis.company_name}_${analysis.job_title}_Resume.pdf`
                          .replace(/\s+/g, '_')
                        await downloadResumePDF(analysis.tailored_resume, filename)
                      }}
                      className="flex-1 text-[10px] font-extrabold px-2 py-1.5 rounded-lg cursor-pointer
                                 bg-emerald-600 dark:bg-emerald-700 text-white
                                 hover:bg-emerald-700 dark:hover:bg-emerald-800 border border-emerald-500/20 transition-colors shadow-sm"
                    >
                      ⬇ PDF
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this resume?')) {
                          deleteAnalysis(analysis.id)
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-550/10 border border-transparent hover:border-red-200/10 cursor-pointer transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredResumes.length > 0 && (
          <div className="space-y-2">
            {filteredResumes.map((analysis) => {
              const previewSkills = (analysis.tailored_resume?.skillCategories && analysis.tailored_resume.skillCategories.length > 0)
                ? analysis.tailored_resume.skillCategories.flatMap((cat: any) => cat.skills || [])
                : (analysis.tailored_resume?.skills || []);

              return (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-4 
                             bg-white dark:bg-[#121212] border border-zinc-200 
                             dark:border-zinc-900 rounded-xl
                             hover:border-zinc-350 dark:hover:border-zinc-700 
                             transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`px-2 py-1 rounded text-xs font-bold border 
                                     whitespace-nowrap ${getAtsColor(analysis.ats_score?.after || 0)}`}>
                      {analysis.ats_score?.after || 0}%
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-base font-bold text-zinc-900 dark:text-white truncate">
                        {analysis.company_name}
                      </p>
                      
                      {/* Responsive Subtitle */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-body text-sm text-zinc-500 dark:text-white/55 truncate">
                          {analysis.job_title}
                        </span>
                        
                        {/* Mobile-only date & skills */}
                        <span className="text-[10px] text-zinc-405 dark:text-zinc-650 md:hidden">•</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 whitespace-nowrap md:hidden">
                          {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        
                        {previewSkills.length > 0 && (
                          <>
                            <span className="text-[10px] text-zinc-405 dark:text-zinc-650 md:hidden">•</span>
                            <div className="flex gap-1 items-center md:hidden">
                              {previewSkills.slice(0, 2).map((skill: string, i: number) => (
                                <span key={i} className="font-body text-[11px] font-medium text-zinc-550 dark:text-white/50 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/8 px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop-only metadata (skills & date) */}
                  <div className="hidden md:flex items-center gap-6 flex-1 min-w-0 justify-end mr-6">
                    {/* Skills tags */}
                    {previewSkills.length > 0 && (
                      <div className="hidden lg:flex items-center gap-1.5 flex-wrap justify-end max-w-[200px] xl:max-w-[350px]">
                        {previewSkills.slice(0, 3).map((skill: string, i: number) => (
                          <span key={i} className="font-body text-[11px] font-medium text-zinc-550 dark:text-white/50 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/8 px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Date */}
                    <span className="text-xs text-zinc-450 dark:text-zinc-550 whitespace-nowrap">
                      {new Date(analysis.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Desktop Buttons */}
                  <div className="hidden md:flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedResume(analysis)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer
                               border-zinc-200 dark:border-zinc-850
                               text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/60
                               hover:bg-zinc-100 dark:hover:bg-zinc-805 transition-colors shadow-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={async () => {
                      const filename = `${analysis.company_name}_${analysis.job_title}_Resume.pdf`
                        .replace(/\s+/g, '_')
                      await downloadResumePDF(analysis.tailored_resume, filename)
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer
                               bg-zinc-950 dark:bg-white 
                               text-white dark:text-black
                               hover:bg-zinc-850 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                  >
                    ⬇ PDF
                  </button>
                  <button
                    onClick={() => handleUseAsBase(analysis)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer
                               bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                  >
                    Use as Base
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete?')) deleteAnalysis(analysis.id)
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 cursor-pointer transition-colors"
                  >
                    🗑
                  </button>
                </div>

                {/* Mobile Dropdown Menu */}
                <div className="relative md:hidden ml-4">
                  <button
                    onClick={() => setActiveDropdownId(activeDropdownId === analysis.id ? null : analysis.id)}
                    className="dropdown-trigger p-2 text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 
                               hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    aria-label="Actions"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>

                  {activeDropdownId === analysis.id && (
                    <div className="dropdown-menu absolute right-0 mt-1 w-48 bg-white dark:bg-[#18181b] 
                                    border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl 
                                    py-1.5 z-10 transition-all transform origin-top-right">
                      <button
                        onClick={() => {
                          setSelectedResume(analysis)
                          setActiveDropdownId(null)
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-350 
                                   hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-955 dark:hover:text-white
                                   flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        View Resume
                      </button>
                      
                      <button
                        onClick={async () => {
                          setActiveDropdownId(null)
                          const filename = `${analysis.company_name}_${analysis.job_title}_Resume.pdf`
                            .replace(/\s+/g, '_')
                          await downloadResumePDF(analysis.tailored_resume, filename)
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-350 
                                   hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-955 dark:hover:text-white
                                   flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download PDF
                      </button>

                      <button
                        onClick={() => {
                          setActiveDropdownId(null)
                          handleUseAsBase(analysis)
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-355 
                                   hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-955 dark:hover:text-white
                                   flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Use as Base
                      </button>

                      <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

                      <button
                        onClick={() => {
                          setActiveDropdownId(null)
                          if (window.confirm('Delete this resume?')) {
                            deleteAnalysis(analysis.id)
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 
                                   hover:bg-rose-50 dark:hover:bg-rose-955/35
                                   flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}

        {/* Resume Detail Modal */}
        {selectedResume && (
          <div className="fixed inset-0 bg-black/70 flex items-center 
                          justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 
                            dark:border-zinc-800 rounded-2xl w-full max-w-2xl 
                            max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-[#121212] 
                              border-b border-zinc-200 dark:border-zinc-800 
                              px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {selectedResume.company_name}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedResume.job_title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedResume(null)}
                  className="text-zinc-550 hover:text-zinc-900 dark:hover:text-white text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Actions */}
              <div className="px-6 py-4 flex flex-wrap gap-3 border-b 
                              border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={async () => {
                    const filename = `${selectedResume.company_name}_${selectedResume.job_title}_Resume.pdf`
                      .replace(/\s+/g, '_')
                    await downloadResumePDF(selectedResume.tailored_resume, filename)
                  }}
                  className="bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-850 dark:hover:bg-zinc-200
                             px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  ⬇ Download PDF
                </button>
                <button
                  onClick={() => {
                    handleUseAsBase(selectedResume)
                    setSelectedResume(null)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white 
                             px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  ✓ Use as Base Resume
                </button>
                <button
                  onClick={() => {
                    navigate('/analyze', {
                      state: { jdText: selectedResume.jd_text }
                    })
                    setSelectedResume(null)
                  }}
                  className="border border-zinc-200 dark:border-zinc-700 
                             text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800
                             px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  ↻ Re-analyze
                </button>
              </div>

              {/* Modal Content — Resume Preview */}
              <div className="px-6 py-6 space-y-6">
                {/* Summary */}
                {selectedResume.tailored_resume?.summary && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Professional Summary</h3>
                    <p className="text-xs text-zinc-700 dark:text-zinc-305 leading-relaxed text-left">
                      {selectedResume.tailored_resume.summary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {((selectedResume.tailored_resume?.skillCategories && selectedResume.tailored_resume.skillCategories.length > 0) || 
                  (selectedResume.tailored_resume?.skills && selectedResume.tailored_resume.skills.length > 0)) && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Skills</h3>
                    {selectedResume.tailored_resume.skillCategories && selectedResume.tailored_resume.skillCategories.length > 0 ? (
                      <div className="space-y-3 pt-1">
                        {selectedResume.tailored_resume.skillCategories.map((cat: any, idx: number) => (
                          <div key={idx} className="space-y-1 text-left">
                            <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">{cat.category}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.skills.map((s: string, sIdx: number) => (
                                <span
                                  key={sIdx}
                                  className="font-body text-[11px] font-medium text-zinc-550 dark:text-white/50 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/8 px-2 py-0.5 rounded"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedResume.tailored_resume.skills.map((s: string, idx: number) => (
                          <span
                            key={idx}
                            className="font-body text-[11px] font-medium text-zinc-550 dark:text-white/50 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/8 px-2 py-0.5 rounded"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Experience */}
                {selectedResume.tailored_resume?.experience?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white 
                                   uppercase tracking-wider mb-3">Experience</h3>
                    <div className="space-y-4">
                      {selectedResume.tailored_resume.experience.map((exp: any, i: number) => (
                        <div key={i} className="border-b border-zinc-100 dark:border-zinc-850/40 pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between mb-1">
                            <p className="font-semibold text-zinc-900 dark:text-white text-sm">
                              {exp.role} — <span className="text-zinc-500 font-normal">{exp.company}</span>
                            </p>
                            <p className="text-xs text-zinc-450">{exp.duration}</p>
                          </div>
                          <ul className="space-y-1.5 mt-2">
                            {exp.bullets?.map((b: string, bi: number) => (
                              <li key={bi} className="text-xs text-zinc-650 dark:text-zinc-300 
                                                      flex gap-2 leading-relaxed">
                                <span className="text-zinc-400">•</span><span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {selectedResume.tailored_resume?.projects?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white 
                                   uppercase tracking-wider mb-3">Projects</h3>
                    <div className="space-y-4">
                      {selectedResume.tailored_resume.projects.map((proj: any, i: number) => (
                        <div key={i} className="border-b border-zinc-100 dark:border-zinc-850/40 pb-4 last:border-0 last:pb-0">
                          <p className="font-semibold text-zinc-900 dark:text-white text-sm">
                            {proj.name}
                          </p>
                          {proj.tech?.length > 0 && (
                            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">
                              {proj.tech.join(', ')}
                            </p>
                          )}
                          <ul className="space-y-1.5 mt-2">
                            {proj.bullets?.map((b: string, bi: number) => (
                              <li key={bi} className="text-xs text-zinc-650 dark:text-zinc-300 
                                                      flex gap-2 leading-relaxed">
                                <span className="text-zinc-400">•</span><span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements / Positions / Certifications */}
                {((selectedResume.tailored_resume?.achievements && selectedResume.tailored_resume.achievements.length > 0) ||
                  (selectedResume.tailored_resume?.positions && selectedResume.tailored_resume.positions.length > 0) ||
                  (selectedResume.tailored_resume?.certifications && selectedResume.tailored_resume.certifications.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    {selectedResume.tailored_resume.achievements && selectedResume.tailored_resume.achievements.length > 0 && (
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-5.25a1.125 1.125 0 00-1.125 1.125v3.375m9 0h-9M9 10.5V6.75m0 0l-3.75 3.75M9 6.75L12.75 10.5M9 6.75h6.75" />
                          </svg>
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Achievements</span>
                        </div>
                        <ul className="space-y-1.5">
                          {selectedResume.tailored_resume.achievements.map((item: string, idx: number) => (
                            <li key={idx} className="text-[10px] text-zinc-700 dark:text-zinc-305 leading-relaxed flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedResume.tailored_resume.positions && selectedResume.tailored_resume.positions.length > 0 && (
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.24 0-4.364-.647-6.17-1.782v-.109a11.386 11.386 0 014.912-1.782v.109A11.386 11.386 0 0110.09 21M15 9.75a3 3 0 11-6 0 3 3 0 016 0zm-9.75 0a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Leadership</span>
                        </div>
                        <div className="space-y-2.5">
                          {selectedResume.tailored_resume.positions.map((pos: any, idx: number) => (
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
                    {selectedResume.tailored_resume.certifications && selectedResume.tailored_resume.certifications.length > 0 && (
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Certifications</span>
                        </div>
                        <div className="space-y-2.5">
                          {selectedResume.tailored_resume.certifications.map((cert: any, idx: number) => (
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
                )}

                {/* ATS Score */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 
                                flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Original</p>
                    <p className="text-2xl font-bold text-zinc-400 dark:text-zinc-500">
                      {selectedResume.ats_score?.before || 0}%
                    </p>
                  </div>
                  <span className="text-zinc-350 dark:text-zinc-700 text-xl font-light">→</span>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Tailored</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {selectedResume.ats_score?.after || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
