import { create } from 'zustand';
import type { ParsedResume, GitHubRepo, RankedProject, CareerAdvice } from '../types';

interface AgentState {
  jdText: string;
  rankedProjects: RankedProject[];
  tailoredResume: ParsedResume | null;
  atsScore: { before: number; after: number } | null;
  missingKeywords: string[];
  careerAdvice: CareerAdvice | null;
  agentStatus: 'idle' | 'step1' | 'step2' | 'step3' | 'done' | 'error';
  error: string | null;
  setJdText: (text: string) => void;
  setAgentStatus: (status: AgentState['agentStatus']) => void;
  runAgent: (repos: GitHubRepo[], baseResume: ParsedResume) => Promise<void>;
  resetAgent: () => void;
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

async function callGroqAPI(apiKey: string, prompt: string): Promise<any> {
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (
    !data.choices ||
    data.choices.length === 0 ||
    !data.choices[0].message ||
    !data.choices[0].message.content
  ) {
    throw new Error('Invalid response structure received from Groq.');
  }

  const cleanText = cleanJsonResponse(data.choices[0].message.content);
  return JSON.parse(cleanText);
}

export const useAgentStore = create<AgentState>((set, get) => ({
  jdText: '',
  rankedProjects: [],
  tailoredResume: null,
  atsScore: null,
  missingKeywords: [],
  careerAdvice: null,
  agentStatus: 'idle',
  error: null,
  setJdText: (jdText) => set({ jdText }),
  setAgentStatus: (agentStatus) => set({ agentStatus }),
  resetAgent: () =>
    set({
      rankedProjects: [],
      tailoredResume: null,
      atsScore: null,
      missingKeywords: [],
      careerAdvice: null,
      agentStatus: 'idle',
      error: null,
    }),
  runAgent: async (repos, baseResume) => {
    const { jdText } = get();
    if (!jdText.trim()) {
      set({ error: 'Job description cannot be empty.', agentStatus: 'error' });
      return;
    }

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      set({
        error: 'VITE_GROQ_API_KEY is not configured in your .env file.',
        agentStatus: 'error',
      });
      return;
    }

    set({ error: null, agentStatus: 'step1' });

    try {
      // Step 1: Project Ranker
      const step1Prompt = `You are an expert tech recruiter.

GitHub repos: ${JSON.stringify(
        repos.map((r) => ({
          name: r.name,
          description: r.description,
          language: r.language,
          topics: r.topics,
          readme: r.readme?.slice(0, 500) || '',
        }))
      )}

Job Description: ${jdText}

Pick the top 3 most relevant repos for this role.
Return ONLY raw JSON matching this schema:
{
  "rankedProjects": [
    { "name": "string", "reason": "string", "relevanceScore": number }
  ]
}`;

      const step1Result = await callGroqAPI(apiKey, step1Prompt);
      if (!step1Result.rankedProjects || !Array.isArray(step1Result.rankedProjects)) {
        throw new Error('Project ranker response did not contain rankedProjects list.');
      }
      set({ rankedProjects: step1Result.rankedProjects, agentStatus: 'step2' });

      // Step 2: Resume Rewriter
      const step2Prompt = `You are an expert resume writer and ATS specialist.

Candidate base resume: ${JSON.stringify(baseResume)}
Top matched GitHub projects: ${JSON.stringify(step1Result.rankedProjects)}
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
  "atsScore": { "before": number, "after": number },
  "missingKeywords": ["string"]
}`;

      const step2Result = await callGroqAPI(apiKey, step2Prompt);
      if (!step2Result.tailoredResume || !step2Result.atsScore) {
        throw new Error('Resume rewriter response was missing required fields.');
      }
      set({
        tailoredResume: step2Result.tailoredResume,
        atsScore: step2Result.atsScore,
        missingKeywords: step2Result.missingKeywords || [],
        agentStatus: 'step3',
      });

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

      const step3Result = await callGroqAPI(apiKey, step3Prompt);
      const careerAdvice: CareerAdvice = {
        strengths: step3Result.strengths || [],
        gaps: step3Result.gaps || [],
        actionItem: step3Result.actionItem || '',
        interviewTopics: step3Result.interviewTopics || [],
      };

      set({ careerAdvice, agentStatus: 'done' });
    } catch (err: any) {
      console.error(err);
      set({
        error: err.message || 'An error occurred during AI analysis.',
        agentStatus: 'error',
      });
    }
  },
}));
