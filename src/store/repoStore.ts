import { create } from 'zustand';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { extractJSON } from '../lib/extractJSON';
import type { GitHubRepo, RepoAnalysis } from '../types';

interface RepoState {
  repos: GitHubRepo[];
  loading: boolean;
  error: string | null;
  fetchRepos: (token: string) => Promise<void>;
  clearRepos: () => void;
  repoAnalyses: RepoAnalysis[];
  analysisStatus: 'idle' | 'analyzing' | 'done';
  analysisProgress: { current: number; total: number; currentRepo: string };
  generatingReadmeFor: string | null;
  pushingReadmeFor: string | null;
  bulkReadmeProgress: string | null;
  setRepoAnalyses: (analyses: RepoAnalysis[]) => void;
  setAnalysisStatus: (status: 'idle' | 'analyzing' | 'done') => void;
  setAnalysisProgress: (progress: { current: number; total: number; currentRepo: string }) => void;
  analyzeAllRepos: (userId: string) => Promise<void>;
  reAnalyzeAllRepos: (userId: string) => Promise<void>;
  generateReadme: (repoName: string) => Promise<string>;
  pushReadme: (userId: string, repoName: string, content: string) => Promise<void>;
  analyzeSingleRepo: (userId: string, repoName: string) => Promise<void>;
  bulkGenerateReadmes: (userId: string) => Promise<void>;
}

function decodeBase64Utf8(str: string): string {
  try {
    const cleanStr = str.replace(/\s/g, '');
    const binString = atob(cleanStr);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) || 0);
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error('Error decoding base64:', e);
    return '';
  }
}

function selectKeyFiles(treeNodes: any[]): string[] {
  const selectedPaths: string[] = [];
  const srcOrComponentPaths: string[] = [];
  
  // Binary extension list to ignore
  const binaryExtensions = /\.(png|jpg|jpeg|svg|ico|lock|gif|mp4|woff|woff2|eot|ttf|webp|zip|tar|gz|pdf)$/i;

  for (const node of treeNodes) {
    if (node.type !== 'blob') continue;
    if (typeof node.size === 'number' && node.size >= 102400) continue; // Skip files >= 100KB
    
    const path = node.path;
    const filename = path.split('/').pop() || '';
    
    if (binaryExtensions.test(filename)) continue;
    
    // Priority files
    if (filename === 'package.json') {
      selectedPaths.push(path);
    } else if (filename === 'requirements.txt' || filename === 'pyproject.toml') {
      selectedPaths.push(path);
    } else if (['index.js', 'index.ts', 'App.tsx', 'main.py', 'app.py'].includes(filename)) {
      selectedPaths.push(path);
    } else if (
      (path.startsWith('src/') || path.includes('/src/') || path.startsWith('components/') || path.includes('/components/')) &&
      !filename.includes('lock') // Skip lock files
    ) {
      srcOrComponentPaths.push(path);
    }
  }

  // Take up to 3 files from src or components folder
  const takenSrc = srcOrComponentPaths.slice(0, 3);
  selectedPaths.push(...takenSrc);

  // Dedup paths
  return Array.from(new Set(selectedPaths));
}

function isRepoEffectivelyEmpty(repo: { readme?: string; fileTree?: string[]; keyFiles?: { path: string; content: string }[] }): boolean {
  const hasFileTree = (repo.fileTree || []).length > 1; // more than just e.g. a .gitignore
  const hasKeyFiles = (repo.keyFiles || []).length > 0 && repo.keyFiles!.some(f => f.content && f.content.trim().length > 20);
  const hasReadme = !!(repo.readme && repo.readme.trim().length > 30);
  return !hasFileTree && !hasKeyFiles && !hasReadme;
}

async function callOllamaAPI(prompt: string): Promise<any> {
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
        num_predict: 4000,
        temperature: 0
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const textContent = data.message.content;
  return extractJSON(textContent);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  loading: false,
  error: null,
  repoAnalyses: [],
  analysisStatus: 'idle',
  analysisProgress: { current: 0, total: 0, currentRepo: '' },
  generatingReadmeFor: null,
  pushingReadmeFor: null,
  bulkReadmeProgress: null,
  setRepoAnalyses: (repoAnalyses) => set({ repoAnalyses }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setAnalysisProgress: (analysisProgress) => set({ analysisProgress }),
  clearRepos: () =>
    set({
      repos: [],
      repoAnalyses: [],
      error: null,
      loading: false,
      analysisStatus: 'idle',
      generatingReadmeFor: null,
      pushingReadmeFor: null,
      bulkReadmeProgress: null,
    }),
  fetchRepos: async (token: string) => {
    if (!token) {
      set({ error: 'GitHub access token is missing. Please re-authenticate.' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          sort: 'updated',
          per_page: 50,
          type: 'owner',
        },
      });

      const reposData = response.data;

      const parsedRepos: GitHubRepo[] = reposData.map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        topics: repo.topics || [],
        html_url: repo.html_url,
        readme: '',
        languages: {},
        fileTree: [],
        keyFiles: [],
        hasReadme: false,
        owner: repo.owner.login,
      }));

      // Fetch READMEs, languages, and codebase file structures in parallel, ignoring individual errors
      const detailPromises = reposData.map(async (repo: any, index: number) => {
        const readmePromise = axios.get(
          `https://api.github.com/repos/${repo.owner.login}/${repo.name}/readme`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        ).then((res) => {
          if (res.data && res.data.content) {
            parsedRepos[index].readme = decodeBase64Utf8(res.data.content);
            parsedRepos[index].hasReadme = true;
          }
        }).catch(() => {
          parsedRepos[index].readme = '';
          parsedRepos[index].hasReadme = false;
        });

        const languagesPromise = axios.get(
          `https://api.github.com/repos/${repo.owner.login}/${repo.name}/languages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        ).then((res) => {
          parsedRepos[index].languages = res.data || {};
        }).catch(() => {
          parsedRepos[index].languages = {};
        });

        const treePromise = axios.get(
          `https://api.github.com/repos/${repo.owner.login}/${repo.name}/git/trees/HEAD?recursive=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        ).then(async (res) => {
          if (res.data && Array.isArray(res.data.tree)) {
            const treeNodes = res.data.tree;
            parsedRepos[index].fileTree = treeNodes.map((n: any) => n.path);
            
            const selectedPaths = selectKeyFiles(treeNodes);
            let totalChars = 0;
            const keyFiles: { path: string; content: string }[] = [];
            
            for (const path of selectedPaths) {
              if (totalChars >= 3000) break;
              try {
                const contentRes = await axios.get(
                  `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${path}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: 'application/vnd.github.v3+json',
                    },
                  }
                );
                if (contentRes.data && contentRes.data.content) {
                  let decoded = decodeBase64Utf8(contentRes.data.content);
                  decoded = decoded.slice(0, 800);
                  
                  const remainingQuota = 3000 - totalChars;
                  if (decoded.length > remainingQuota) {
                    decoded = decoded.slice(0, remainingQuota);
                  }
                  
                  if (decoded.length > 0) {
                    keyFiles.push({ path, content: decoded });
                    totalChars += decoded.length;
                  }
                }
              } catch (e) {
                // Ignore single file error
              }
            }
            parsedRepos[index].keyFiles = keyFiles;
          }
        }).catch(() => {
          parsedRepos[index].fileTree = [];
          parsedRepos[index].keyFiles = [];
        });

        await Promise.all([readmePromise, languagesPromise, treePromise]);
      });

      await Promise.all(detailPromises);

      set({ repos: parsedRepos, loading: false });
      console.log('REPO ANALYSES LOADED:', get().repoAnalyses);
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch repositories from GitHub.',
        loading: false,
      });
    }
  },
  analyzeAllRepos: async (userId: string) => {
    const { repos, setRepoAnalyses, setAnalysisStatus, setAnalysisProgress } = get();
    if (repos.length === 0) return;

    setAnalysisStatus('analyzing');

    try {
      // 1. Check Supabase for existing repo_analyses for this user
      const { data: existing, error } = await supabase
        .from('repo_analyses')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const isValid =
        existing &&
        existing.length > 0 &&
        existing.every((a) => new Date(a.analyzed_at) > oneWeekAgo) &&
        existing.length >= repos.length;

      if (isValid) {
        const mapped: RepoAnalysis[] = existing.map((a) => ({
          id: a.id,
          user_id: a.user_id,
          repo_name: a.repo_name,
          repo_url: a.repo_url || '',
          summary: a.summary || '',
          techStack: Array.isArray(a.tech_stack) ? a.tech_stack : [],
          complexity: (a.complexity as any) || 'beginner',
          domains: Array.isArray(a.domains) ? a.domains : [],
          highlights: Array.isArray(a.highlights) ? a.highlights : [],
          raw_files: Array.isArray(a.raw_files) ? a.raw_files : [],
          analyzed_at: a.analyzed_at,
          isEmpty: !!a.is_empty,
        }));

        setRepoAnalyses(mapped);
        console.log('REPO ANALYSES LOADED:', mapped);
        setAnalysisStatus('done');
        return;
      }

      // If not exists or stale -> delete existing and run full analysis in background
      await supabase
        .from('repo_analyses')
        .delete()
        .eq('user_id', userId);

      const newAnalyses: RepoAnalysis[] = [];
      const total = repos.length;

      for (let i = 0; i < total; i++) {
        const repo = repos[i];
        setAnalysisProgress({ current: i + 1, total, currentRepo: repo.name });

        try {
          if (isRepoEffectivelyEmpty(repo)) {
            const emptyAnalysis = {
              user_id: userId,
              repo_name: repo.name,
              repo_url: repo.html_url,
              summary: "This repository appears to be empty or contains no substantive code that could be analyzed.",
              tech_stack: [],
              complexity: 'beginner',
              domains: [],
              highlights: [],
              raw_files: repo.keyFiles || [],
              analyzed_at: new Date().toISOString(),
              is_empty: true,
            };

            await supabase.from('repo_analyses').insert(emptyAnalysis);

            newAnalyses.push({
              repo_name: repo.name,
              repo_url: repo.html_url,
              summary: emptyAnalysis.summary,
              techStack: [],
              complexity: 'beginner',
              domains: [],
              highlights: [],
              raw_files: repo.keyFiles || [],
              analyzed_at: emptyAnalysis.analyzed_at,
              isEmpty: true,
            });

            continue;
          }

          const prompt = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks. Start with { and end with }. Nothing else.

Analyze this GitHub project:
Project name: ${repo.name}
README: ${repo.readme || 'No README available'}
File tree: ${(repo.fileTree || []).slice(0, 30).join('\n')}
Key files: ${(repo.keyFiles || []).map(f => f.path + ':\n' + f.content).join('\n---\n')}

Rules:
1. Base every claim in 'highlights' strictly on what is directly evidenced in the README, file tree, or key file contents provided below. Do NOT invent specific performance numbers (frame rates, concurrency counts, latency figures, memory/CPU reduction percentages, user counts) unless they are explicitly stated in the README or code comments provided.
2. If no such evidence exists, describe genuine structural/technical characteristics instead — e.g. 'uses component-based architecture with React hooks', 'implements CRUD operations against a MongoDB schema', 'organizes styles using CSS Grid layout' — rather than fabricating performance claims.
3. If the file tree and key files suggest a small, single-purpose, or demo-style project (few files, no backend, no database, no external API integration), the 'complexity' field must be 'beginner' regardless of how the README is worded, and 'highlights' should reflect that modest scope honestly rather than inflating it.

Return this exact JSON:
{
  "summary": "string",
  "techStack": ["string"],
  "complexity": "beginner" | "intermediate" | "advanced",
  "domains": ["string"],
  "highlights": ["string"]
}`;

          const result = await callOllamaAPI(prompt);

          const complexityValue = ['beginner', 'intermediate', 'advanced'].includes(result.complexity)
            ? result.complexity
            : 'beginner';

          await supabase.from('repo_analyses').insert({
            user_id: userId,
            repo_name: repo.name,
            repo_url: repo.html_url,
            summary: result.summary || '',
            tech_stack: Array.isArray(result.techStack) ? result.techStack : [],
            complexity: complexityValue,
            domains: Array.isArray(result.domains) ? result.domains : [],
            highlights: Array.isArray(result.highlights) ? result.highlights : [],
            raw_files: repo.keyFiles || [],
            analyzed_at: new Date().toISOString(),
            is_empty: false,
          });

          newAnalyses.push({
            repo_name: repo.name,
            repo_url: repo.html_url,
            summary: result.summary || '',
            techStack: Array.isArray(result.techStack) ? result.techStack : [],
            complexity: complexityValue as any,
            domains: Array.isArray(result.domains) ? result.domains : [],
            highlights: Array.isArray(result.highlights) ? result.highlights : [],
            raw_files: repo.keyFiles || [],
            analyzed_at: new Date().toISOString(),
            isEmpty: false,
          });
        } catch (repoErr) {
          console.error(`Error analyzing repo ${repo.name}:`, repoErr);
          // Insert failed placeholder row so the process doesn't break
          try {
            await supabase.from('repo_analyses').insert({
              user_id: userId,
              repo_name: repo.name,
              repo_url: repo.html_url,
              summary: 'Analysis failed for this repository.',
              tech_stack: [],
              complexity: 'beginner',
              domains: [],
              highlights: [],
              raw_files: repo.keyFiles || [],
              analyzed_at: new Date().toISOString(),
            });

            newAnalyses.push({
              repo_name: repo.name,
              repo_url: repo.html_url,
              summary: 'Analysis failed for this repository.',
              techStack: [],
              complexity: 'beginner',
              domains: [],
              highlights: [],
              raw_files: repo.keyFiles || [],
              analyzed_at: new Date().toISOString(),
            });
          } catch (e) {
            // Ignore placeholder failure
          }
        }

        // Process one at a time with a 500ms delay between calls
        await delay(500);
      }

      setRepoAnalyses(newAnalyses);
      console.log('REPO ANALYSES LOADED:', newAnalyses);
      setAnalysisStatus('done');
    } catch (err: any) {
      console.error('Codebase analysis error:', err);
      set({ error: err.message || 'Error occurred during codebase analysis.' });
      setAnalysisStatus('idle');
    }
  },
  reAnalyzeAllRepos: async (userId: string) => {
    const { setRepoAnalyses } = get();
    // Delete from Supabase first to clear cache
    await supabase
      .from('repo_analyses')
      .delete()
      .eq('user_id', userId);
    
    setRepoAnalyses([]);
    // Run full analysis
    const { analyzeAllRepos } = get();
    await analyzeAllRepos(userId);
  },
  generateReadme: async (repoName: string): Promise<string> => {
    const { repos } = get();
    const repo = repos.find((r) => r.name === repoName);
    if (!repo) throw new Error('Repository not found');

    set({ generatingReadmeFor: repoName });
    try {
      const prompt = `Generate a professional README.md for this GitHub project.

Project name: ${repo.name}
Primary language: ${repo.language || 'Other'}
File tree: ${(repo.fileTree || []).slice(0, 50).join('\n')}
Key files:
${(repo.keyFiles || []).map((f) => `--- ${f.path} ---\n${f.content}`).join('\n')}

Write these sections:
# Project Name
## About
## Tech Stack
## Features
## Getting Started
## Project Structure

Make it professional and accurate. Return ONLY raw markdown.`;

      const ollamaUrl = (import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          messages: [
            { role: 'system', content: 'You are a technical writer. Output only raw markdown text.' },
            { role: 'user', content: prompt }
          ],
          stream: false,
          options: {
            num_predict: 4000,
            temperature: 0
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      return data.message.content;
    } finally {
      set({ generatingReadmeFor: null });
    }
  },
  pushReadme: async (userId: string, repoName: string, content: string): Promise<void> => {
    const { repos, analyzeSingleRepo } = get();
    const repo = repos.find((r) => r.name === repoName);
    if (!repo) throw new Error('Repository not found');

    const token = localStorage.getItem('gh_provider_token') || '';
    if (!token) throw new Error('GitHub access token is missing');

    set({ pushingReadmeFor: repoName });
    try {
      let sha: string | undefined;
      try {
        const checkRes = await axios.get(
          `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/README.md`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            }
          }
        );
        sha = checkRes.data.sha;
      } catch (err) {
        // Doesn't exist (404)
      }

      const base64Content = btoa(unescape(encodeURIComponent(content)));
      const body: any = {
        message: sha ? 'Update README.md via JobLens' : 'Add README.md via JobLens',
        content: base64Content,
      };
      if (sha) {
        body.sha = sha;
      }

      await axios.put(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/README.md`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          }
        }
      );

      // Update local state
      repo.readme = content;
      repo.hasReadme = true;
      set({ repos: [...repos] });

      // Re-run analysis for this repo only
      await analyzeSingleRepo(userId, repoName);
    } finally {
      set({ pushingReadmeFor: null });
    }
  },
  analyzeSingleRepo: async (userId: string, repoName: string): Promise<void> => {
    const { repos, repoAnalyses, setRepoAnalyses } = get();
    const repo = repos.find((r) => r.name === repoName);
    if (!repo) return;

    try {
      if (isRepoEffectivelyEmpty(repo)) {
        const dbRow = {
          user_id: userId,
          repo_name: repo.name,
          repo_url: repo.html_url,
          summary: "This repository appears to be empty or contains no substantive code that could be analyzed.",
          tech_stack: [],
          complexity: 'beginner',
          domains: [],
          highlights: [],
          raw_files: repo.keyFiles || [],
          analyzed_at: new Date().toISOString(),
          is_empty: true,
        };

        await supabase
          .from('repo_analyses')
          .delete()
          .eq('user_id', userId)
          .eq('repo_name', repoName);

        await supabase.from('repo_analyses').insert(dbRow);

        const updatedAnalysis: RepoAnalysis = {
          repo_name: repo.name,
          repo_url: repo.html_url,
          summary: dbRow.summary,
          techStack: [],
          complexity: 'beginner',
          domains: [],
          highlights: [],
          raw_files: repo.keyFiles || [],
          analyzed_at: dbRow.analyzed_at,
          isEmpty: true,
        };

        const filtered = repoAnalyses.filter((a) => a.repo_name !== repoName);
        setRepoAnalyses([...filtered, updatedAnalysis]);
        return;
      }

      const prompt = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks. Start with { and end with }. Nothing else.

Analyze this GitHub project:
Project name: ${repo.name}
README: ${repo.readme || 'No README available'}
File tree: ${(repo.fileTree || []).slice(0, 30).join('\n')}
Key files: ${(repo.keyFiles || []).map((f) => f.path + ':\n' + f.content).join('\n---\n')}

Rules:
1. Base every claim in 'highlights' strictly on what is directly evidenced in the README, file tree, or key file contents provided below. Do NOT invent specific performance numbers (frame rates, concurrency counts, latency figures, memory/CPU reduction percentages, user counts) unless they are explicitly stated in the README or code comments provided.
2. If no such evidence exists, describe genuine structural/technical characteristics instead — e.g. 'uses component-based architecture with React hooks', 'implements CRUD operations against a MongoDB schema', 'organizes styles using CSS Grid layout' — rather than fabricating performance claims.
3. If the file tree and key files suggest a small, single-purpose, or demo-style project (few files, no backend, no database, no external API integration), the 'complexity' field must be 'beginner' regardless of how the README is worded, and 'highlights' should reflect that modest scope honestly rather than inflating it.

Return this exact JSON:
{
  "summary": "string",
  "techStack": ["string"],
  "complexity": "beginner" | "intermediate" | "advanced",
  "domains": ["string"],
  "highlights": ["string"]
}`;

      const result = await callOllamaAPI(prompt);

      const complexityValue = ['beginner', 'intermediate', 'advanced'].includes(result.complexity)
        ? result.complexity
        : 'beginner';

      const dbRow = {
        user_id: userId,
        repo_name: repo.name,
        repo_url: repo.html_url,
        summary: result.summary || '',
        tech_stack: Array.isArray(result.techStack) ? result.techStack : [],
        complexity: complexityValue,
        domains: Array.isArray(result.domains) ? result.domains : [],
        highlights: Array.isArray(result.highlights) ? result.highlights : [],
        raw_files: repo.keyFiles || [],
        analyzed_at: new Date().toISOString(),
        is_empty: false,
      };

      await supabase
        .from('repo_analyses')
        .delete()
        .eq('user_id', userId)
        .eq('repo_name', repoName);

      await supabase.from('repo_analyses').insert(dbRow);

      const updatedAnalysis: RepoAnalysis = {
        repo_name: repo.name,
        repo_url: repo.html_url,
        summary: result.summary || '',
        techStack: Array.isArray(result.techStack) ? result.techStack : [],
        complexity: complexityValue as any,
        domains: Array.isArray(result.domains) ? result.domains : [],
        highlights: Array.isArray(result.highlights) ? result.highlights : [],
        raw_files: repo.keyFiles || [],
        analyzed_at: new Date().toISOString(),
        isEmpty: false,
      };

      const filtered = repoAnalyses.filter((a) => a.repo_name !== repoName);
      setRepoAnalyses([...filtered, updatedAnalysis]);
    } catch (err) {
      console.error(`Error analyzing single repo ${repoName}:`, err);
    }
  },
  bulkGenerateReadmes: async (userId: string): Promise<void> => {
    const { repos, generateReadme, pushReadme } = get();
    const missingRepos = repos.filter((r) => !r.hasReadme);
    if (missingRepos.length === 0) return;

    const total = missingRepos.length;
    for (let i = 0; i < total; i++) {
      const repo = missingRepos[i];
      set({ bulkReadmeProgress: `Generating README ${i + 1} of ${total}...` });
      try {
        const generated = await generateReadme(repo.name);
        await pushReadme(userId, repo.name, generated);
      } catch (err) {
        console.error(`Error in bulk README generation for ${repo.name}:`, err);
      }
      await delay(500);
    }
    set({ bulkReadmeProgress: null });
  },
}));
