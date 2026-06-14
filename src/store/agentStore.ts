import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedResume, GitHubRepo, RankedProject, CareerAdvice } from '../types';
import { useRepoStore } from './repoStore';
import { extractJSON } from '../lib/extractJSON';

interface AgentState {
  jdText: string;
  jobUrl: string;
  selectedCompany: string;
  selectedJobTitle: string;
  rankedProjects: RankedProject[];
  tailoredResume: ParsedResume | null;
  atsScore: { before: number; after: number } | null;
  missingKeywords: string[];
  careerAdvice: CareerAdvice | null;
  agentStatus: 'idle' | 'reading' | 'step1' | 'step1_done' | 'step2a' | 'step2a_done' | 'step2b' | 'step2b_done' | 'step3' | 'step3_done' | 'done' | 'error';
  statusMessage: string;
  error: string | null;

  setJdText: (text: string) => void;
  setJobUrl: (url: string) => void;
  setSelectedCompany: (company: string) => void;
  setSelectedJobTitle: (title: string) => void;

  setStep1Result: (projects: RankedProject[]) => void;
  setStep2Result: (resume: ParsedResume, ats: { before: number; after: number }, keywords: string[]) => void;
  setStep3Result: (advice: CareerAdvice) => void;

  setAgentStatus: (status: AgentState['agentStatus'], message?: string) => void;
  setError: (error: string | null) => void;
  runAgent: (
    repos: GitHubRepo[],
    baseResume: ParsedResume,
    jobTitle?: string,
    companyName?: string,
    userId?: string,
    resumeFromStep?: number
  ) => Promise<void>;
  resetAgent: () => void;
  clearAnalysis: () => void;
}

async function callOllamaAPI(prompt: string, timeoutMs: number = 180000, customOptions?: any): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [
          {
            role: 'system',
            content: 'You are a JSON API. You only output valid JSON objects. Never output text, explanations, or markdown. Always start with { and end with }.'
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
          num_predict: 2000,
          temperature: 0,
          ...customOptions
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const textContent = data.message.content;
    return extractJSON(textContent);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out. Please check if Ollama is running properly on your machine.');
    }
    throw error;
  }
}

async function callOllamaAPIRaw(prompt: string, timeoutMs: number = 180000, customOptions?: any): Promise<{ parsed: any; rawText: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [
          {
            role: 'system',
            content: 'You are a JSON API. You only output valid JSON objects. Never output text, explanations, or markdown. Always start with { and end with }.'
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
          num_predict: 2000,
          temperature: 0,
          ...customOptions
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const textContent = data.message.content;
    return { parsed: extractJSON(textContent), rawText: textContent };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out. Please check if Ollama is running properly on your machine.');
    }
    throw error;
  }
}


export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      jdText: '',
      jobUrl: '',
      selectedCompany: '',
      selectedJobTitle: '',
      rankedProjects: [],
      tailoredResume: null,
      atsScore: null,
      missingKeywords: [],
      careerAdvice: null,
      agentStatus: 'idle',
      statusMessage: '',
      error: null,

      setJdText: (text) => set({ jdText: text }),
      setJobUrl: (url) => set({ jobUrl: url }),
      setSelectedCompany: (company) => set({ selectedCompany: company }),
      setSelectedJobTitle: (title) => set({ selectedJobTitle: title }),

      // Save after each step completes
      setStep1Result: (projects) => {
        set({
          rankedProjects: projects,
          agentStatus: 'step1_done',
          statusMessage: 'Found top 3 matching projects ✓'
        });
      },

      setStep2Result: (resume, ats, keywords) => {
        set({
          tailoredResume: resume,
          atsScore: ats,
          missingKeywords: keywords,
          agentStatus: 'step2b_done',
          statusMessage: 'Resume tailored successfully ✓'
        });
      },

      setStep3Result: (advice) => {
        set({
          careerAdvice: advice,
          agentStatus: 'step3_done',
          statusMessage: 'Analysis complete ✓'
        });
      },

      setAgentStatus: (status, message = '') => {
        set({ agentStatus: status, statusMessage: message });
      },

      setError: (error) => set({ error, agentStatus: 'error' }),

      resetAgent: () => {
        get().clearAnalysis();
      },

      // Clear analysis
      clearAnalysis: () => set({
        jdText: '',
        jobUrl: '',
        selectedCompany: '',
        selectedJobTitle: '',
        rankedProjects: [],
        tailoredResume: null,
        atsScore: null,
        missingKeywords: [],
        careerAdvice: null,
        agentStatus: 'idle',
        statusMessage: '',
        error: null
      }),

      runAgent: async (repos, baseResume, _jobTitle, _companyName, _userId, resumeFromStep) => {
        set({ error: null });

        const { jdText } = get();
        if (!jdText.trim()) {
          set({ error: 'Job description cannot be empty.', agentStatus: 'error' });
          return;
        }

        if (repos.length === 0) {
          set({ error: 'No repositories selected for analysis.', agentStatus: 'error' });
          return;
        }

        const repoAnalyses = useRepoStore.getState().repoAnalyses;
        if (!repoAnalyses || repoAnalyses.length === 0) {
          set({
            error: 'Your GitHub repositories are still being analyzed. Please wait or refresh the page.',
            agentStatus: 'error',
          });
          return;
        }

        try {
          let step1Result = { rankedProjects: get().rankedProjects };

          if (!resumeFromStep || resumeFromStep < 2) {
            set({ error: null, agentStatus: 'step1', statusMessage: 'Analyzing your GitHub projects and codebase...' });

            const selectedAnalyses = repoAnalyses.filter((a) =>
              repos.some((r) => r.name === a.repo_name)
            );

            // Step 1: Project Ranker
            const step1Prompt = `You are a recruitment expert. You must ONLY choose from these EXACT project names listed below. Do NOT invent or suggest any other projects. Do NOT make up project names.

Available projects in this candidate's GitHub:
${selectedAnalyses.map((r, i) => `
${i + 1}. ${r.repo_name}
   Summary: ${r.summary}
   Tech: ${r.techStack?.join(', ')}
   Domains: ${r.domains?.join(', ')}
   Highlights: ${r.highlights?.join(', ')}
`).join('\n')}

Job Description: ${jdText}

Choose the top 3 projects from the list above.
Return ONLY raw JSON:
{
  "rankedProjects": [
    { 
      "name": "string (MUST be one of the project names listed above)",
      "reason": "string",
      "relevanceScore": "number (0-100)"
    }
  ]
}`;

            const apiResult = await callOllamaAPI(step1Prompt);
            if (!apiResult.rankedProjects || !Array.isArray(apiResult.rankedProjects)) {
              throw new Error('Project ranker response did not contain rankedProjects list.');
            }
            step1Result = apiResult;
            set({ rankedProjects: step1Result.rankedProjects, agentStatus: 'step1_done', statusMessage: 'Found top 3 matching projects ✓' });
          }

          // Transition to step 2 immediately
          let step2Result = {
            tailoredResume: get().tailoredResume,
            atsScore: get().atsScore,
            missingKeywords: get().missingKeywords
          };

          if (!resumeFromStep || resumeFromStep < 3) {
            // Extract keywords from Job Description
            const jdKeywords = jdText
              .match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*|\b[A-Z]{2,}\b/g)
              ?.slice(0, 20)
              ?.join(', ') || jdText.slice(0, 200);

            // Trim inputs aggressively
            const trimmedExperience = baseResume.experience.map(exp => ({
              company: exp.company,
              role: exp.role,
              duration: exp.duration,
              bullets: exp.bullets.slice(0, 3)
            }));

            const trimmedProjects = baseResume.projects.slice(0, 4).map(proj => ({
              name: proj.name,
              tech: proj.tech.slice(0, 5),
              link: proj.link || '',
              bullets: proj.bullets.slice(0, 2)
            }));

            // Before Step 2A call
            console.log('Base resume being sent:', {
              experienceCount: trimmedExperience.length,
              projectCount: trimmedProjects.length,
              skillCount: baseResume.skills.length
            });

            // Call 2A — Rewrite Experience + Skills only
            set({ agentStatus: 'step2a', statusMessage: 'Rewriting experience and skills...' });

            const prompt2A = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks, no 'Here are' or any text before or after. Start your response with { and end with }. Nothing else.

Rewrite ONLY the experience bullets and skills for this resume.
Keep bullets 15-20 words each. Minimum 2 bullets per job.
Inject these JD keywords naturally: ${jdKeywords}

Experience to rewrite:
${JSON.stringify(trimmedExperience)}

Current skills: ${baseResume.skills.join(', ')}

IMPORTANT SKILLS TAILORING DIRECTIONS:
1. Reorder the skills: Place the technical/hard skills that directly match or support the Job Description at the beginning of the "skills" array. Move less relevant or general tools to the end of the array. Do NOT output them in the same original order.
2. Inject soft skills: Scan the Job Description for crucial soft skills (e.g., Communication, Project Management, Collaboration, Mentoring, Agile, Leadership, Problem Solving) and inject the top 4-5 relevant soft skills directly into the "skills" array.
3. Add missing technical keywords: If the Job Description requires relevant technical skills that are missing from "Current skills" but are supported by the experience bullets, add them to the "skills" array.
Ensure the outputted "skills" array is a refined, distinct, and comprehensive list of both hard and soft skills.

atsScore.before and atsScore.after must be whole numbers between 0 and 100, NOT decimals.

Return ONLY raw JSON:
{
  "skills": ["string"],
  "experience": [{
    "company": "string",
    "role": "string",
    "duration": "string",
    "bullets": ["string"]
  }],
  "atsScore": { "before": number, "after": number },
  "missingKeywords": ["string"]
}`;

            const response2A = await callOllamaAPIRaw(prompt2A, 180000, { num_predict: 3000, temperature: 0 });
            const rawText = response2A.rawText;
            const result2A = response2A.parsed;

            // After Step 2A call
            console.log('Step 2A raw response:', rawText.slice(0, 200));
            console.log('Step 2A parsed:', result2A);

            const atsScoreResult = result2A?.atsScore || result2A?.ats_score;
            if (!result2A.experience || !result2A.skills || !atsScoreResult) {
              throw new Error('Call 2A (Experience & Skills) response was missing required fields.');
            }

            set({ agentStatus: 'step2a_done', statusMessage: 'Experience and skills rewritten ✓' });

            // Call 2B — Rewrite Projects only
            set({ agentStatus: 'step2b', statusMessage: 'Rewriting projects...' });

            const prompt2B = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks, no 'Here are' or any text before or after. Start your response with { and end with }. Nothing else.

Rewrite ONLY the project bullets for this resume.
Keep bullets 15-20 words each. Minimum 2 bullets per project.
Inject these JD keywords naturally: ${jdKeywords}

Projects to rewrite:
${JSON.stringify(trimmedProjects)}

Return ONLY raw JSON:
{
  "projects": [{
    "name": "string",
    "tech": ["string"],
    "link": "string",
    "bullets": ["string"]
  }]
}`;

            const result2B = await callOllamaAPI(prompt2B, 180000, { num_predict: 2000, temperature: 0 });
            
            // After Step 2B call  
            console.log('Step 2B parsed:', result2B);

            if (!result2B.projects) {
              throw new Error('Call 2B (Projects) response was missing required fields.');
            }

            set({ agentStatus: 'step2b_done', statusMessage: 'Projects rewritten ✓' });

            // Merge results into tailoredResume
            const tailoredResume: ParsedResume = {
              name: baseResume.name,
              email: baseResume.email,
              phone: baseResume.phone,
              linkedin: baseResume.linkedin || '',
              github: baseResume.github || '',
              // USE AI RESULTS — not base resume
              skills: result2A?.skills?.length > 0 
                ? result2A.skills 
                : baseResume.skills,
              experience: result2A?.experience?.length > 0 
                ? result2A.experience 
                : baseResume.experience,
              projects: result2B?.projects?.length > 0 
                ? result2B.projects 
                : baseResume.projects,
              education: baseResume.education,
              achievements: baseResume.achievements || []
            };

            // Final merged resume
            console.log('Final tailored resume:', tailoredResume);

            // Extract atsScore safely
            const atsScore = {
              before: result2A?.atsScore?.before || result2A?.ats_score?.before || 0,
              after: result2A?.atsScore?.after || result2A?.ats_score?.after || 0
            };

            step2Result = {
              tailoredResume,
              atsScore,
              missingKeywords: result2A.missingKeywords || result2A.missing_keywords || []
            };

            set({
              tailoredResume: step2Result.tailoredResume,
              atsScore: step2Result.atsScore,
              missingKeywords: step2Result.missingKeywords,
              agentStatus: 'step2b_done',
              statusMessage: 'Resume tailored successfully ✓'

            });
          }

          // Transition to step 3 immediately
          set({ agentStatus: 'step3', statusMessage: 'Generating personalized career advice...' });

          // Step 3: Career Coach
          const step3Prompt = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks, no 'Here are' or any text before or after. Start your response with { and end with }. Nothing else.

Candidate profile: ${JSON.stringify(baseResume)}
Target role JD: ${jdText}
Tailored resume: ${JSON.stringify(step2Result.tailoredResume)}

Give honest, specific career advice for this exact role.
Return ONLY raw JSON matching this schema:
{
  "strengths": ["string"],
  "gaps": ["string"],
  "actionItem": "string",
  "interviewTopics": ["string"]
}`;

          const step3Result = await callOllamaAPI(step3Prompt);
          const careerAdvice: CareerAdvice = {
            strengths: step3Result.strengths || [],
            gaps: step3Result.gaps || [],
            actionItem: step3Result.actionItem || '',
            interviewTopics: step3Result.interviewTopics || [],
          };

          set({
            careerAdvice,
            agentStatus: 'step3_done',
            statusMessage: 'Analysis complete ✓'
          });

          // Done
          set({ agentStatus: 'done', statusMessage: '✓ Analysis complete — scroll down to see results' });
        } catch (err: any) {
          console.error(err);
          set({
            error: err.message || 'An error occurred during AI analysis.',
            agentStatus: 'error',
          });
        }
      },
    }),
    {
      name: 'joblens-agent-state',
      partialize: (state) => ({
        jdText: state.jdText,
        jobUrl: state.jobUrl,
        selectedCompany: state.selectedCompany,
        selectedJobTitle: state.selectedJobTitle,
        rankedProjects: state.rankedProjects,
        tailoredResume: state.tailoredResume,
        atsScore: state.atsScore,
        missingKeywords: state.missingKeywords,
        careerAdvice: state.careerAdvice,
        agentStatus: state.agentStatus,
        statusMessage: state.statusMessage,
        error: state.error,
      }),
    }
  )
);
