import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import { useAuthStore } from '../store/authStore';
import { useResumeStore } from '../store/resumeStore';
import type { ParsedResume, Experience, Project, Education } from '../types';
import { parseResume } from '../lib/parseResume';

// Set up PDFJS worker using unpkg CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;



export const Onboarding: React.FC = () => {
  const { user } = useAuthStore();
  const {
    resume,
    rawText,
    loading: resumeLoading,
    error: resumeError,
    setResume,
    setRawText,
    saveResume,
    fetchResume,
  } = useResumeStore();

  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Form edit states
  const [editedResume, setEditedResume] = useState<ParsedResume | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchResume(user.id);
    }
  }, [user?.id, fetchResume]);

  useEffect(() => {
    if (resume) {
      setEditedResume(resume);
      setInputText(rawText);
      setStep(2);
    }
  }, [resume]);

  // Handle PDF text extraction
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let textContent = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textObj = await page.getTextContent();
        const pageText = textObj.items.map((item: any) => item.str).join(' ');
        textContent += pageText + '\n';
      }

      if (!textContent.trim()) {
        throw new Error('PDF appears to be empty or scanned images only.');
      }

      setInputText(textContent);
      await handleParseText(textContent);
    } catch (err: any) {
      console.error(err);
      setParseError(
        err.message || 'Failed to extract text from PDF. Please paste instead.'
      );
      setIsParsing(false);
    }
  };

  const handleParseText = async (text: string) => {
    if (!text.trim()) {
      setParseError('Please enter some resume content.');
      return;
    }
    setIsParsing(true);
    setParseError(null);
    try {
      const parsed = await parseResume(text);
      console.log('PARSED RESULT:', parsed);
      setEditedResume(parsed);
      setRawText(text);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Failed to parse resume content.');
    } finally {
      setIsParsing(false);
    }
  };

  // Form updates
  const handleContactChange = (field: keyof ParsedResume, value: string) => {
    if (!editedResume) return;
    setEditedResume({ ...editedResume, [field]: value });
  };

  const handleSkillsChange = (value: string) => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      skills: value.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  // Experience modification
  const handleExpChange = (index: number, field: keyof Experience, value: any) => {
    if (!editedResume) return;
    const newExp = [...editedResume.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    setEditedResume({ ...editedResume, experience: newExp });
  };

  const addExperience = () => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      experience: [
        ...editedResume.experience,
        { company: '', role: '', duration: '', bullets: [''] },
      ],
    });
  };

  const removeExperience = (index: number) => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      experience: editedResume.experience.filter((_, i) => i !== index),
    });
  };

  // Projects modification
  const handleProjChange = (index: number, field: keyof Project, value: any) => {
    if (!editedResume) return;
    const newProj = [...editedResume.projects];
    newProj[index] = { ...newProj[index], [field]: value };
    setEditedResume({ ...editedResume, projects: newProj });
  };

  const addProject = () => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      projects: [
        ...editedResume.projects,
        { name: '', tech: [''], bullets: [''] },
      ],
    });
  };

  const removeProject = (index: number) => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      projects: editedResume.projects.filter((_, i) => i !== index),
    });
  };

  // Education modification
  const handleEduChange = (index: number, field: keyof Education, value: any) => {
    if (!editedResume) return;
    const newEdu = [...editedResume.education];
    newEdu[index] = { ...newEdu[index], [field]: value };
    setEditedResume({ ...editedResume, education: newEdu });
  };

  const addEducation = () => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      education: [
        ...editedResume.education,
        { institution: '', degree: '', year: '' },
      ],
    });
  };

  const removeEducation = (index: number) => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      education: editedResume.education.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!editedResume || !user?.id) return;
    setResume(editedResume);
    const success = await saveResume(user.id);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {step === 1 ? 'Import Base Resume' : 'Review Profile Details'}
        </h1>
        <p className="font-body text-sm text-zinc-500 dark:text-white/50 mt-1">
          {step === 1
            ? 'Import your current resume text or upload a PDF to extract your experience.'
            : 'Validate and refine the parsed information before continuing.'}
        </p>
      </div>

      {(resumeError || parseError) && (
        <div className="p-3 mb-6 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs">
          {resumeError || parseError}
        </div>
      )}

      {/* STEP 1: Upload / Paste */}
      {step === 1 && (
        <div className="space-y-6">
          {/* PDF Uploader */}
          <div className="border border-dashed border-zinc-250 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#121212]/50 hover:bg-zinc-100/70 dark:hover:bg-[#121212] hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
            <svg
              className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
              Upload base resume (PDF)
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
              Text will be extracted client-side inside your browser.
            </span>
            <label className="cursor-pointer bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border border-zinc-900 dark:border-zinc-200 hover:bg-zinc-850 dark:hover:bg-zinc-200 text-xs px-4 py-2 rounded-lg font-medium transition-all shadow-sm">
              Choose File
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={isParsing}
              />
            </label>
            {isParsing && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 animate-pulse mt-3">
                Parsing PDF contents...
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-200 dark:border-zinc-800 w-full"></div>
            <span className="bg-zinc-50 dark:bg-[#0f0f0f] px-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-[1.5px] uppercase absolute">
              OR
            </span>
          </div>

          {/* Textarea Paste */}
          <div className="space-y-2">
            <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-white/40 block">
              Paste Resume Plain Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the full text of your resume here..."
              className="w-full h-80 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 text-xs text-zinc-800 dark:text-zinc-350 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 resize-none font-mono transition-colors"
            ></textarea>
          </div>

          {/* Parse Button */}
          <div className="flex justify-end">
            <button
              onClick={() => handleParseText(inputText)}
              disabled={isParsing || !inputText.trim()}
              className="font-body text-sm font-semibold tracking-[0.1px] bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] hover:bg-zinc-850 dark:hover:bg-zinc-200 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Parse Text Content
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Review & Edit Form */}
      {step === 2 && editedResume && (
        <div className="space-y-8 animate-fadeIn">
          {/* Contact Details */}
          <div className="glass-card relative overflow-hidden rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Top accent colorful gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-inner shadow-emerald-500/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                  Contact Info
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Your primary identifier and communication details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editedResume.name}
                  onChange={(e) => handleContactChange('name', e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editedResume.email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editedResume.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                Skills (Comma Separated)
              </label>
              <input
                type="text"
                value={editedResume.skills.join(', ')}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="e.g. React, TypeScript, Python, AWS"
                className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className="glass-card relative overflow-hidden rounded-xl p-6 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Top accent colorful gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl shadow-inner shadow-teal-500/5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Work Experience
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Previous roles, companies, and key achievements</p>
                </div>
              </div>
              <button
                onClick={addExperience}
                className="text-[10px] text-teal-600 hover:text-white dark:text-teal-400 dark:hover:text-white font-bold border border-teal-200 dark:border-teal-900/50 hover:border-teal-500 dark:hover:border-teal-500 px-3 py-1.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-500 dark:hover:bg-teal-600 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Experience
              </button>
            </div>

            <div className="space-y-6">
              {editedResume.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="border-t border-zinc-150 dark:border-zinc-800/80 pt-6 first:border-0 first:pt-0 relative group"
                >
                  <button
                    onClick={() => removeExperience(idx)}
                    className="absolute right-0 top-6 first:top-0 p-1 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all cursor-pointer"
                    title="Remove experience"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Company
                      </label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) =>
                          handleExpChange(idx, 'company', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-teal-500 dark:focus:border-teal-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-teal-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Role
                      </label>
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) =>
                          handleExpChange(idx, 'role', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-teal-500 dark:focus:border-teal-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-teal-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={exp.duration}
                        onChange={(e) =>
                          handleExpChange(idx, 'duration', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-teal-500 dark:focus:border-teal-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-teal-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                      Description Bullets (one per line)
                    </label>
                    <textarea
                      value={exp.bullets.join('\n')}
                      onChange={(e) =>
                        handleExpChange(idx, 'bullets', e.target.value.split('\n'))
                      }
                      rows={3}
                      className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-teal-500 dark:focus:border-teal-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-teal-500/10 rounded-lg p-3.5 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none font-sans resize-y transition-all duration-200"
                    ></textarea>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="glass-card relative overflow-hidden rounded-xl p-6 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Top accent colorful gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-inner shadow-indigo-500/5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Projects
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Independent work, open source, and highlights</p>
                </div>
              </div>
              <button
                onClick={addProject}
                className="text-[10px] text-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:text-white font-bold border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-500 dark:hover:border-indigo-500 px-3 py-1.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-500 dark:hover:bg-indigo-600 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Project
              </button>
            </div>

            <div className="space-y-6">
              {editedResume.projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="border-t border-zinc-150 dark:border-zinc-800/80 pt-6 first:border-0 first:pt-0 relative"
                >
                  <button
                    onClick={() => removeProject(idx)}
                    className="absolute right-0 top-6 first:top-0 p-1 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all cursor-pointer"
                    title="Remove project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={proj.name}
                        onChange={(e) =>
                          handleProjChange(idx, 'name', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-indigo-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Tech Stack (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={proj.tech.join(', ')}
                        onChange={(e) =>
                          handleProjChange(
                            idx,
                            'tech',
                            e.target.value.split(',').map((t) => t.trim())
                          )
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-indigo-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                      Description Bullets (one per line)
                    </label>
                    <textarea
                      value={proj.bullets.join('\n')}
                      onChange={(e) =>
                        handleProjChange(idx, 'bullets', e.target.value.split('\n'))
                      }
                      rows={3}
                      className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-indigo-500/10 rounded-lg p-3.5 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none font-sans resize-y transition-all duration-200"
                    ></textarea>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="glass-card relative overflow-hidden rounded-xl p-6 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Top accent colorful gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shadow-inner shadow-amber-500/5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Education
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Schools, degrees, and graduation details</p>
                </div>
              </div>
              <button
                onClick={addEducation}
                className="text-[10px] text-amber-600 hover:text-white dark:text-amber-400 dark:hover:text-white font-bold border border-amber-200 dark:border-amber-900/50 hover:border-amber-500 dark:hover:border-amber-500 px-3 py-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-500 dark:hover:bg-amber-600 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Education
              </button>
            </div>

            <div className="space-y-6">
              {editedResume.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="border-t border-zinc-150 dark:border-zinc-800/80 pt-6 first:border-0 first:pt-0 relative"
                >
                  <button
                    onClick={() => removeEducation(idx)}
                    className="absolute right-0 top-6 first:top-0 p-1 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all cursor-pointer"
                    title="Remove education"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Institution
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) =>
                          handleEduChange(idx, 'institution', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-amber-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Degree
                      </label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) =>
                          handleEduChange(idx, 'degree', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-amber-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400 block">
                        Graduation Year
                      </label>
                      <input
                        type="text"
                        value={edu.year}
                        onChange={(e) =>
                          handleEduChange(idx, 'year', e.target.value)
                        }
                        className="w-full bg-zinc-50/50 dark:bg-[#161616]/40 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#161616] focus:ring-2 focus:ring-amber-500/10 rounded-lg px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setStep(1)}
              className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-955 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-850 px-5 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Back to Import
            </button>
            <button
              onClick={handleSave}
              disabled={resumeLoading}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white disabled:opacity-50 text-xs font-bold px-6 py-2.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-md hover:shadow-emerald-500/10 active:scale-95 border-0"
            >
              {resumeLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              Save Base Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
