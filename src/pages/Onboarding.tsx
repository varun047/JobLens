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
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          {step === 1 ? 'Import Base Resume' : 'Review Profile Details'}
        </h1>
        <p className="text-zinc-500 text-xs mt-1">
          {step === 1
            ? 'Import your current resume text or upload a PDF to extract your experience.'
            : 'Validate and refine the parsed information before continuing.'}
        </p>
      </div>

      {(resumeError || parseError) && (
        <div className="p-3 mb-6 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs">
          {resumeError || parseError}
        </div>
      )}

      {/* STEP 1: Upload / Paste */}
      {step === 1 && (
        <div className="space-y-6">
          {/* PDF Uploader */}
          <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center bg-[#121212]/50 hover:bg-[#121212] hover:border-zinc-750 transition-colors">
            <svg
              className="w-8 h-8 text-zinc-500 mb-3"
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
            <span className="text-xs font-medium text-zinc-300">
              Upload base resume (PDF)
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 mb-4">
              Text will be extracted client-side inside your browser.
            </span>
            <label className="cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 text-xs px-4 py-2 rounded-lg font-medium transition-all">
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
              <span className="text-[11px] text-zinc-400 animate-pulse mt-3">
                Parsing PDF contents...
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-900 w-full"></div>
            <span className="bg-[#0f0f0f] px-3 text-[10px] text-zinc-600 font-semibold tracking-wider uppercase absolute">
              OR
            </span>
          </div>

          {/* Textarea Paste */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400">
              Paste Resume Plain Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the full text of your resume here..."
              className="w-full h-80 bg-[#121212] border border-zinc-900 rounded-xl p-4 text-xs text-zinc-350 focus:outline-none focus:border-zinc-700 resize-none font-mono"
            ></textarea>
          </div>

          {/* Parse Button */}
          <div className="flex justify-end">
            <button
              onClick={() => handleParseText(inputText)}
              disabled={isParsing || !inputText.trim()}
              className="bg-white text-[#0f0f0f] hover:bg-zinc-200 disabled:opacity-50 text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Parse Text Content
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Review & Edit Form */}
      {step === 2 && editedResume && (
        <div className="space-y-8">
          {/* Contact Details */}
          <div className="bg-[#121212] border border-zinc-900 rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Contact Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editedResume.name}
                  onChange={(e) => handleContactChange('name', e.target.value)}
                  className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editedResume.email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editedResume.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                Skills (Comma Separated)
              </label>
              <input
                type="text"
                value={editedResume.skills.join(', ')}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="e.g. React, TypeScript, Python, AWS"
                className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-[#121212] border border-zinc-900 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Work Experience
              </h3>
              <button
                onClick={addExperience}
                className="text-[10px] text-zinc-400 hover:text-white font-medium border border-zinc-800 px-2 py-1 rounded bg-zinc-950 transition-colors"
              >
                + Add Experience
              </button>
            </div>

            {editedResume.experience.map((exp, idx) => (
              <div
                key={idx}
                className="border-t border-zinc-900 pt-6 first:border-0 first:pt-0 relative group"
              >
                <button
                  onClick={() => removeExperience(idx)}
                  className="absolute right-0 top-6 first:top-0 text-zinc-500 hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Company
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) =>
                        handleExpChange(idx, 'company', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Role
                    </label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) =>
                        handleExpChange(idx, 'role', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) =>
                        handleExpChange(idx, 'duration', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                    Description Bullets (one per line)
                  </label>
                  <textarea
                    value={exp.bullets.join('\n')}
                    onChange={(e) =>
                      handleExpChange(idx, 'bullets', e.target.value.split('\n'))
                    }
                    rows={3}
                    className="w-full bg-[#161616] border border-zinc-850 rounded-lg p-3 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-sans resize-y"
                  ></textarea>
                </div>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="bg-[#121212] border border-zinc-900 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Projects
              </h3>
              <button
                onClick={addProject}
                className="text-[10px] text-zinc-400 hover:text-white font-medium border border-zinc-800 px-2 py-1 rounded bg-zinc-950 transition-colors"
              >
                + Add Project
              </button>
            </div>

            {editedResume.projects.map((proj, idx) => (
              <div
                key={idx}
                className="border-t border-zinc-900 pt-6 first:border-0 first:pt-0 relative"
              >
                <button
                  onClick={() => removeProject(idx)}
                  className="absolute right-0 top-6 first:top-0 text-zinc-500 hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) =>
                        handleProjChange(idx, 'name', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
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
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                    Description Bullets (one per line)
                  </label>
                  <textarea
                    value={proj.bullets.join('\n')}
                    onChange={(e) =>
                      handleProjChange(idx, 'bullets', e.target.value.split('\n'))
                    }
                    rows={3}
                    className="w-full bg-[#161616] border border-zinc-850 rounded-lg p-3 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-sans resize-y"
                  ></textarea>
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="bg-[#121212] border border-zinc-900 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Education
              </h3>
              <button
                onClick={addEducation}
                className="text-[10px] text-zinc-400 hover:text-white font-medium border border-zinc-800 px-2 py-1 rounded bg-zinc-950 transition-colors"
              >
                + Add Education
              </button>
            </div>

            {editedResume.education.map((edu, idx) => (
              <div
                key={idx}
                className="border-t border-zinc-900 pt-6 first:border-0 first:pt-0 relative"
              >
                <button
                  onClick={() => removeEducation(idx)}
                  className="absolute right-0 top-6 first:top-0 text-zinc-500 hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Institution
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) =>
                        handleEduChange(idx, 'institution', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Degree
                    </label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) =>
                        handleEduChange(idx, 'degree', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Graduation Year
                    </label>
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) =>
                        handleEduChange(idx, 'year', e.target.value)
                      }
                      className="w-full bg-[#161616] border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-850 hover:border-zinc-700 px-5 py-2.5 rounded-lg transition-colors cursor-pointer bg-zinc-950"
            >
              Back to Import
            </button>
            <button
              onClick={handleSave}
              disabled={resumeLoading}
              className="bg-white text-[#0f0f0f] hover:bg-zinc-200 disabled:opacity-50 text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              {resumeLoading && (
                <div className="w-3.5 h-3.5 border-2 border-zinc-800 border-t-zinc-200 rounded-full animate-spin"></div>
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
