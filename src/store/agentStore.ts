import { create } from 'zustand';
import type { ParsedResume, GitHubRepo, RankedProject, CareerAdvice } from '../types';

interface AgentState {
  jdText: string;
  rankedProjects: RankedProject[];
  tailoredResume: ParsedResume | null;
  atsScore: { before: number; after: number } | null;
  missingKeywords: string[];
  careerAdvice: CareerAdvice | null;
  agentStatus: 'idle' | 'reading' | 'step1' | 'step1_done' | 'step2' | 'step2_done' | 'step3' | 'step3_done' | 'done' | 'error';
  statusMessage: string;
  error: string | null;
  setJdText: (text: string) => void;
  setAgentStatus: (status: AgentState['agentStatus'], message?: string) => void;
  runAgent: (repos: GitHubRepo[], baseResume: ParsedResume) => Promise<void>;
  resetAgent: () => void;
}

async function callOllamaAPI(prompt: string): Promise<any> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const textContent = data.message.content;
  const clean = textContent.replace(/```json|```/gi, '').trim();
  return JSON.parse(clean);
}

export const useAgentStore = create<AgentState>((set, get) => ({
  jdText: '',
  rankedProjects: [],
  tailoredResume: null,
  atsScore: null,
  missingKeywords: [],
  careerAdvice: null,
  agentStatus: 'idle',
  statusMessage: '',
  error: null,
  setJdText: (jdText) => set({ jdText }),
  setAgentStatus: (agentStatus, statusMessage = '') => set({ agentStatus, statusMessage }),
  resetAgent: () =>
    set({
      rankedProjects: [],
      tailoredResume: null,
      atsScore: null,
      missingKeywords: [],
      careerAdvice: null,
      agentStatus: 'idle',
      statusMessage: '',
      error: null,
    }),
  runAgent: async (repos, baseResume) => {
    const { jdText } = get();
    if (!jdText.trim()) {
      set({ error: 'Job description cannot be empty.', agentStatus: 'error' });
      return;
    }

    set({ error: null, agentStatus: 'step1', statusMessage: 'Analyzing your GitHub projects and codebase...' });

    try {
      // Step 1: Project Ranker
      const step1Prompt = `You are an expert tech recruiter.

GitHub repos:
${repos.map((r) => `
Repo: ${r.name}
README: ${r.readme?.slice(0, 300)}
Key files:
${r.keyFiles?.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n') || 'None'}
`).join('\n\n')}

Job Description: ${jdText}

Pick the top 3 most relevant repos for this role.
Return ONLY raw JSON matching this schema:
{
  "rankedProjects": [
    { "name": "string", "reason": "string", "relevanceScore": number }
  ]
}`;

      const step1Result = await callOllamaAPI(step1Prompt);
      if (!step1Result.rankedProjects || !Array.isArray(step1Result.rankedProjects)) {
        throw new Error('Project ranker response did not contain rankedProjects list.');
      }
      set({ rankedProjects: step1Result.rankedProjects, agentStatus: 'step1_done', statusMessage: 'Found top 3 matching projects ✓' });

      // Transition to step 2 immediately
      set({ agentStatus: 'step2', statusMessage: 'Rewriting resume bullets to match JD keywords...' });

      // Step 2: Resume Rewriter
      const step2Prompt = `You are an expert resume writer and ATS specialist.

Candidate base resume: ${JSON.stringify(baseResume)}
Top matched GitHub projects with match details: ${JSON.stringify(
        step1Result.rankedProjects.map((rp: RankedProject) => {
          const repo = repos.find((r) => r.name === rp.name);
          return {
            name: rp.name,
            reason: rp.reason,
            relevanceScore: rp.relevanceScore,
            description: repo?.description || '',
            language: repo?.language || '',
            languages: repo?.languages || {},
            topics: repo?.topics || [],
            readme: repo?.readme?.slice(0, 500) || '',
          };
        })
      )}
Job Description: ${jdText}

Rewrite the resume tailored to this JD:
- Rewrite experience bullets using JD keywords naturally
- Feature the top 3 matched projects prominently with tailored descriptions
- Reorder skills to prioritize what the JD values most
- Keep the same structure, just improve the content

Return ONLY raw JSON matching this schema:
{
  "tailoredResume": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "skills": ["string"],
    "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }],
    "projects": [{ "name": "string", "tech": ["string"], "bullets": ["string"] }],
    "education": [{ "institution": "string", "degree": "string", "year": "string" }]
  },
  "atsScore": { "before": number between 0-100, "after": number between 0-100 },
  "missingKeywords": ["string"]
}

Return scores as whole numbers like 62 or 78, NOT decimals like 0.62.`;

      const step2Result = await callOllamaAPI(step2Prompt);
      if (!step2Result.tailoredResume || !step2Result.atsScore) {
        throw new Error('Resume rewriter response was missing required fields.');
      }
      set({
        tailoredResume: step2Result.tailoredResume,
        atsScore: step2Result.atsScore,
        missingKeywords: step2Result.missingKeywords || [],
        agentStatus: 'step2_done',
        statusMessage: 'Resume tailored successfully ✓'
      });

      // Transition to step 3 immediately
      set({ agentStatus: 'step3', statusMessage: 'Generating personalized career advice...' });

      // Step 3: Career Coach
      const step3Prompt = `You are a senior engineering career coach.

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
}));
