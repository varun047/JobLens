import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedResume, GitHubRepo, RankedProject, CareerAdvice, JDIntelligence, ATSBreakdown } from '../types';
import { useRepoStore } from './repoStore';
import { extractJSON } from '../lib/extractJSON';
import { validateResume, type ValidationWarning, computeATSBreakdown } from '../lib/validateResume';

interface AgentState {
  jdText: string;
  jobUrl: string;
  selectedCompany: string;
  selectedJobTitle: string;
  rankedProjects: RankedProject[];
  tailoredResume: ParsedResume | null;
  atsScore: {
    before: number;
    after: number;
    breakdown?: {
      keywordMatch: number;
      bulletQuality: number;
      quantification: number;
      sectionsComplete: number;
      achievementsPresent: number;
    };
  } | null;
  missingKeywords: string[];
  careerAdvice: CareerAdvice | null;
  jdIntelligence: JDIntelligence | null;
  validationWarnings: ValidationWarning[];
  atsBreakdown: ATSBreakdown | null;
  agentStatus: 'idle' | 'jd_intel' | 'jd_intel_done' | 'extracting' | 'step1' | 'step1_done' | 'step2a' | 'step2a_done' | 'step2b' | 'step2b_done' | 'step2c' | 'step2c_done' | 'step2d' | 'step2d_done' | 'step2_done' | 'step3' | 'step3_done' | 'done' | 'error';
  statusMessage: string;
  error: string | null;

  setJdText: (text: string) => void;
  setJobUrl: (url: string) => void;
  setSelectedCompany: (company: string) => void;
  setSelectedJobTitle: (title: string) => void;

  setStep1Result: (projects: RankedProject[]) => void;
  setStep2Result: (
    resume: ParsedResume,
    ats: {
      before: number;
      after: number;
      breakdown?: {
        keywordMatch: number;
        bulletQuality: number;
        quantification: number;
        sectionsComplete: number;
        achievementsPresent: number;
      };
    },
    keywords: string[]
  ) => void;
  setStep3Result: (advice: CareerAdvice) => void;
  setJDIntelligence: (intel: JDIntelligence | null) => void;

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
    const ollamaUrl = (import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
    const response = await fetch(`${ollamaUrl}/api/chat`, {
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




async function extractJDIntelligence(jdText: string): Promise<JDIntelligence> {
  const prompt = `You are a recruitment expert. Analyze this job description and extract key intelligence.

Return ONLY raw JSON matching this schema:
{
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "seniority": "fresher" | "junior" | "mid" | "senior",
  "companyType": "startup" | "enterprise" | "product" | "service" | "unknown",
  "keyActionWords": ["string"],
  "dailyResponsibilities": ["string"]
}

Job Description:
${jdText}

Start your response with { and end with }. Nothing else.`;

  return callOllamaAPI(prompt);
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
      jdIntelligence: null,
      validationWarnings: [],
      atsBreakdown: null,
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
          statusMessage: 'Found top matching projects ✓'
        });
      },

      setStep2Result: (resume, ats, keywords) => {
        set({
          tailoredResume: resume,
          atsScore: ats,
          missingKeywords: keywords,
          agentStatus: 'step2_done',
          statusMessage: 'Resume tailored ✓'
        });
      },

      setStep3Result: (advice) => {
        set({
          careerAdvice: advice,
          agentStatus: 'step3_done',
          statusMessage: 'Career analysis complete ✓'
        });
      },

      setJDIntelligence: (intel) => set({ jdIntelligence: intel }),

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
        jdIntelligence: null,
        validationWarnings: [],
        atsBreakdown: null,
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
          let jdIntelligence = get().jdIntelligence;
          let step1Result = { rankedProjects: get().rankedProjects };

          // Step 0: Extract JD Intelligence
          if (!resumeFromStep || resumeFromStep === 1 || !jdIntelligence) {
            set({ agentStatus: 'jd_intel', statusMessage: 'Reading and understanding the job description...' });
            jdIntelligence = await extractJDIntelligence(jdText);
            set({ jdIntelligence, agentStatus: 'jd_intel_done', statusMessage: 'Job description understood ✓' });
            console.log('JD Intelligence:', jdIntelligence);
          }

          if (!resumeFromStep || resumeFromStep < 2) {
            set({ agentStatus: 'step1', statusMessage: 'Analyzing your GitHub projects for best fit...' });

            const selectedAnalyses = repoAnalyses.filter((a) =>
              repos.some((r) => r.name === a.repo_name)
            );

            // Step 1: Project Ranker
            const step1Prompt = `You are a recruitment expert. You must ONLY choose from these EXACT project names listed below. Do NOT invent or suggest any other projects. Do NOT make up project names.

Available projects in this candidate's GitHub:
${selectedAnalyses.map((r, i) => `
${i + 1}. ${r.repo_name}
   Summary: ${r.summary}
   Tech: ${Array.isArray(r.techStack) ? r.techStack.join(', ') : r.techStack || ''}
   Domains: ${Array.isArray(r.domains) ? r.domains.join(', ') : r.domains || ''}
   Highlights: ${Array.isArray(r.highlights) ? r.highlights.join(', ') : r.highlights || ''}
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
            set({ rankedProjects: step1Result.rankedProjects, agentStatus: 'step1_done', statusMessage: 'Found top matching projects ✓' });
          }

          // Transition to step 2
          let tailoredResume = get().tailoredResume;
          let atsScore = get().atsScore;
          let missingKeywords = get().missingKeywords;

          if (!resumeFromStep || resumeFromStep < 3) {
            const currentStatus = get().agentStatus;

            // Initialize results from tailoredResume for intermediate recovery
            let summaryResult = tailoredResume?.summary || '';
            let experienceResult = tailoredResume?.experience || [];
            let projectsResult = tailoredResume?.projects || [];
            let skillCategoriesResult = tailoredResume?.skillCategories || [];
            let skillsResult = tailoredResume?.skills || [];

            // Step 2A: Rewrite Professional Summary
            const shouldRun2A = !['step2a_done', 'step2b', 'step2b_done', 'step2c', 'step2c_done', 'step2d', 'step2d_done', 'step2_done'].includes(currentStatus) || !summaryResult;
            if (shouldRun2A) {
              set({ agentStatus: 'step2a', statusMessage: 'Writing your professional summary...' });
              const educationYear = baseResume.education[0]?.year ? ` (Graduation/Timing: ${baseResume.education[0].year})` : '';
              const summaryPrompt = `You are an expert resume writer.

Write a 3-line professional summary for this candidate tailored to the job description. All three lines must be concatenated into a single string under the "summary" key of the JSON object.

Rules for the summary text:
1. Line 1: State the candidate's actual current status (e.g., "final-year ${baseResume.education[0]?.degree || 'student'} student" or "professional with X years of experience") based on the profile, explicitly naming the target role/seniority (e.g., "targeting a ${jdIntelligence?.seniority || 'mid'} Software Engineer role"). Do NOT use vague "brings a foundation" language.
2. Line 2: Top 2-3 technical strengths most relevant to JD.
3. Line 3: What they bring to this specific role/company.

Content constraints:
- Do NOT use generic corporate filler phrases. Vague filler phrases like "drive innovation and growth", "dynamic environment", "passionate about", "strong technical foundation", "results-driven" must not appear.
- Every sentence must contain a specific, concrete detail (a real skill, a real project name, a real status/timeline) — not a vague claim.
- Keep it under 60 words total. Do NOT use first person (no "I" or "My"). Use third person.

Candidate profile:
Name: ${baseResume.name}
Current role/status: ${baseResume.experience[0]?.role || 'Student'} at ${baseResume.experience[0]?.company || baseResume.education[0]?.institution}
Education: ${baseResume.education[0]?.degree} from ${baseResume.education[0]?.institution}${educationYear}
Top skills: ${baseResume.skills.slice(0, 8).join(', ')}
Key experience highlights: ${baseResume.experience.map(e => e.role + ' at ' + e.company).join('; ')}
Key project highlights: ${baseResume.projects.map(p => p.name).join(', ')}

Target Seniority Level: ${jdIntelligence?.seniority || 'mid'}
Target Company Type: ${jdIntelligence?.companyType || 'unknown'}
Required skills from JD: ${jdIntelligence?.requiredSkills?.join(', ') || ''}

Return ONLY raw JSON matching this schema exactly. The JSON object must contain exactly one key named "summary", and nothing else:
{ "summary": "Line 1 text. Line 2 text. Line 3 text." }`;

              const result2A = await callOllamaAPI(summaryPrompt);
              if (!result2A.summary) {
                throw new Error('Professional summary rewriting failed.');
              }
              summaryResult = result2A.summary;
              set({ agentStatus: 'step2a_done', tailoredResume: { ...(tailoredResume || baseResume), summary: summaryResult } });
            }

            // Step 2B: Rewrite Experience Bullets & Calculate ATS Score
            const shouldRun2B = !['step2b_done', 'step2c', 'step2c_done', 'step2d', 'step2d_done', 'step2_done'].includes(currentStatus) || experienceResult.length === 0;
            if (shouldRun2B) {
              set({ agentStatus: 'step2b', statusMessage: 'Rewriting experience with impact metrics...' });
              const experiencePrompt = `You are an expert resume writer.

Rewrite the candidate's professional experience bullets to align with the job description.

RULES FOR BULLET POINTS:
1. Start with strong action verbs (e.g., Developed, Designed, Optimizing, Architected, Automated, Led).
2. EXPLICITLY BANNED WORDS: Worked, Helped, Assisted, Responsible for, Participated. Do NOT use these.
3. Use the XYZ formula: "Accomplished X by doing Y resulting in Z".
4. Be 15-20 words per bullet point.
5. Include a real metric where plausible (e.g., time saved, users served, % improvement, lines of code, components built). If exact metrics are unknown, use reasonable estimates, but caution against wildly precise-sounding invented numbers (e.g. prefer "reduced load time by an estimated 20-30%" framing or a qualitative claim over a suspiciously precise single invented figure like "37.4% improvement" when no real number was provided).
6. Naturally include 1-2 of these required skills where truthful: ${jdIntelligence?.requiredSkills?.slice(0, 6)?.join(', ') || ''}

RULES FOR ATS SCORE CALCULATION:
Calculate actual ATS score (before and after tailoring) as whole numbers between 0 and 100 based on keyword match, bullet quality, quantification, sections complete, and achievements present.

Experience to rewrite:
${JSON.stringify(baseResume.experience.map(exp => ({
  company: exp.company,
  role: exp.role,
  duration: exp.duration,
  originalBullets: exp.bullets
})))}

Return ONLY raw JSON matching this schema:
{
  "experience": [{
    "company": "string",
    "role": "string",
    "duration": "string",
    "bullets": ["string"] // 3-4 bullets per experience
  }],
  "atsScore": {
    "before": number, // whole number 0-100, based on original resume
    "after": number  // whole number 0-100, based on tailored resume
  },
  "missingKeywords": ["string"]
}`;

              const result2B = await callOllamaAPI(experiencePrompt);
              if (!result2B.experience || !result2B.atsScore) {
                throw new Error('Experience rewriting and ATS scoring failed.');
              }
              experienceResult = result2B.experience;
              atsScore = result2B.atsScore;
              missingKeywords = result2B.missingKeywords || [];
              set({ 
                atsScore, 
                missingKeywords, 
                agentStatus: 'step2b_done', 
                tailoredResume: { ...(tailoredResume || baseResume), experience: experienceResult } 
              });
            }

            // Step 2C: Rewrite Project Bullets
            const shouldRun2C = !['step2c_done', 'step2d', 'step2d_done', 'step2_done'].includes(currentStatus) || projectsResult.length === 0;
            if (shouldRun2C) {
              set({ agentStatus: 'step2c', statusMessage: 'Tailoring project descriptions...' });
              const projectPrompt = `You are an expert resume writer.

Rewrite the candidate's project descriptions to align with the job description.

RULES FOR PROJECT BULLETS:
1. Lead with the technical achievement, not the description.
2. Start with strong action verbs (e.g., Built, Developed, Designed, Optimized).
3. EXPLICITLY BANNED WORDS: Worked, Helped, Assisted, Responsible for, Participated. Do NOT use these.
4. Use the XYZ formula: "Accomplished X by doing Y resulting in Z".
5. Be 15-20 words per bullet point.
6. Handling of metrics:
   - For projects that are clearly personal/academic/practice projects (no evidence of real production users — infer this from the project description/README content passed in, or default to treating any project without explicit deployment/user-count evidence as personal/practice), do NOT invent usage-scale numbers (requests/sec, user counts, records processed) that imply real-world production traffic. Instead emphasize concrete TECHNICAL scope: architecture decisions, specific algorithms/data structures used, number of components/modules built, lines of code, test coverage, or performance optimizations that are inherent to the code itself (e.g. "reduced query time from X to Y via indexing" is fine if it's a genuine before/after the codebase shows; "served 50,000 users" for a project with no deployment evidence is not).
   - Only use usage-scale metrics (requests handled, users served, uptime) for projects with clear evidence of real deployment/usage in the repo/README data passed into the prompt.
   - When no real metric is available and none can be credibly inferred, it's better to describe technical depth qualitatively (e.g. "applying OOP principles and modular component architecture") than to invent a specific fake number.
7. Naturally include 1-2 of these required skills where truthful: ${jdIntelligence?.requiredSkills?.slice(0, 4)?.join(', ') || ''}

Chosen projects (already ranked by relevance):
${JSON.stringify(step1Result.rankedProjects.map(rp => {
  const proj = baseResume.projects.find(p => 
    p.name.toLowerCase().includes(rp.name.toLowerCase()) ||
    rp.name.toLowerCase().includes(p.name.toLowerCase())
  );
  return proj || { name: rp.name, tech: [], bullets: [] };
}))}

Return ONLY raw JSON matching this schema:
{
  "projects": [{
    "name": "string",
    "tech": ["string"],
    "bullets": ["string"] // 2-3 bullets with metrics
  }]
}`;

              const result2C = await callOllamaAPI(projectPrompt);
              if (!result2C.projects) {
                throw new Error('Projects rewriting failed.');
              }
              projectsResult = result2C.projects;
              set({ agentStatus: 'step2c_done', tailoredResume: { ...(tailoredResume || baseResume), projects: projectsResult } });
            }

            // Step 2D: Rewrite Skills Section
            const shouldRun2D = !['step2d_done', 'step2_done'].includes(currentStatus) || skillsResult.length === 0;
            if (shouldRun2D) {
              set({ agentStatus: 'step2d', statusMessage: 'Optimizing skills for ATS...' });
              const skillsPrompt = `You are an expert resume writer.

Reorder and categorize skills for maximum JD relevance.

RULES FOR SKILLS CATEGORIZATION:
1. Group into exactly these categories:
   - Frontend
   - Backend
   - Tools
   - Languages
   - Other
2. Put JD-required skills first within each category.
3. Add any missing technical skills from the JD's required list IF and only if it is plausibly supported by the candidate's experience or projects (do NOT fabricate skills with zero support).

Current skills: ${baseResume.skills.join(', ')}
JD required skills: ${jdIntelligence?.requiredSkills?.join(', ') || ''}
JD preferred skills: ${jdIntelligence?.preferredSkills?.join(', ') || ''}

Return ONLY raw JSON matching this schema:
{
  "skillCategories": [
    { "category": "Frontend" | "Backend" | "Tools" | "Languages" | "Other", "skills": ["string"] }
  ],
  "skills": ["string"] // flattened array of all skills in order for backward compatibility
}`;

              const result2D = await callOllamaAPI(skillsPrompt);
              if (!result2D.skills) {
                throw new Error('Skills reordering failed.');
              }
              skillCategoriesResult = result2D.skillCategories || [];
              skillsResult = result2D.skills;
              set({ agentStatus: 'step2d_done' });
            }

            // Merge all results
            tailoredResume = {
              name: baseResume.name,
              email: baseResume.email,
              phone: baseResume.phone,
              linkedin: baseResume.linkedin || '',
              github: baseResume.github || '',
              portfolio: baseResume.portfolio || '',
              summary: summaryResult || baseResume.summary || '',
              skills: skillsResult && skillsResult.length > 0 ? skillsResult : baseResume.skills,
              skillCategories: skillCategoriesResult && skillCategoriesResult.length > 0 ? skillCategoriesResult : baseResume.skillCategories || [],
              experience: experienceResult && experienceResult.length > 0 ? experienceResult : baseResume.experience,
              projects: projectsResult && projectsResult.length > 0 ? projectsResult : baseResume.projects,
              education: baseResume.education,
              achievements: baseResume.achievements || [],
              positions: baseResume.positions || [],
              certifications: baseResume.certifications || [],
              rawText: baseResume.rawText || ''
            };

            const validationWarnings = validateResume(tailoredResume);
            const atsBreakdown = jdIntelligence ? computeATSBreakdown(tailoredResume, jdIntelligence, validationWarnings) : null;
            set({
              tailoredResume,
              atsScore: atsScore || { before: 0, after: 0 },
              missingKeywords: missingKeywords || [],
              validationWarnings,
              atsBreakdown,
              agentStatus: 'step2_done',
              statusMessage: 'Resume tailored ✓'
            });
          }

          // Step 3: Career advice
          set({ agentStatus: 'step3', statusMessage: 'Generating personalized career advice...' });
          const step3Prompt = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks, no 'Here are' or any text before or after. Start your response with { and end with }. Nothing else.

Candidate profile: ${JSON.stringify(baseResume)}
Target role JD: ${jdText}
Tailored resume: ${JSON.stringify(tailoredResume)}

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
            statusMessage: 'Career analysis complete ✓'
          });

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
        jdIntelligence: state.jdIntelligence,
        validationWarnings: state.validationWarnings,
        atsBreakdown: state.atsBreakdown,
        agentStatus: state.agentStatus,
        statusMessage: state.statusMessage,
        error: state.error,
      }),
    }
  )
);
