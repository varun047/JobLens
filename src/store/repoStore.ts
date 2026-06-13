import { create } from 'zustand';
import axios from 'axios';
import { supabase } from '../lib/supabase';
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
  setRepoAnalyses: (analyses: RepoAnalysis[]) => void;
  setAnalysisStatus: (status: 'idle' | 'analyzing' | 'done') => void;
  setAnalysisProgress: (progress: { current: number; total: number; currentRepo: string }) => void;
  analyzeAllRepos: (userId: string) => Promise<void>;
  reAnalyzeAllRepos: (userId: string) => Promise<void>;
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  loading: false,
  error: null,
  repoAnalyses: [],
  analysisStatus: 'idle',
  analysisProgress: { current: 0, total: 0, currentRepo: '' },
  setRepoAnalyses: (repoAnalyses) => set({ repoAnalyses }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setAnalysisProgress: (analysisProgress) => set({ analysisProgress }),
  clearRepos: () => set({ repos: [], repoAnalyses: [], error: null, loading: false, analysisStatus: 'idle' }),
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
          }
        }).catch(() => {
          parsedRepos[index].readme = '';
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
        }));

        setRepoAnalyses(mapped);
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
          const prompt = `Analyze this GitHub project and return ONLY raw JSON:
{
  "summary": "string",          // 2-3 sentence what it does
  "techStack": ["string"],      // all technologies used
  "complexity": "beginner" | "intermediate" | "advanced",
  "domains": ["string"],        // e.g. ["frontend", "fullstack", "dashboard", "api"]
  "highlights": ["string"]      // top 3 impressive things about this project
}

Project name: ${repo.name}
README: ${repo.readme || 'No README available'}
Key files: ${repo.keyFiles ? repo.keyFiles.map((f: any) => f.path + ': ' + f.content).join('\n') : 'No key files available'}`;

          const result = await callOllamaAPI(prompt);

          await supabase.from('repo_analyses').insert({
            user_id: userId,
            repo_name: repo.name,
            repo_url: repo.html_url,
            summary: result.summary || '',
            tech_stack: result.techStack || [],
            complexity: result.complexity || 'beginner',
            domains: result.domains || [],
            highlights: result.highlights || [],
            raw_files: repo.keyFiles || [],
            analyzed_at: new Date().toISOString(),
          });

          newAnalyses.push({
            repo_name: repo.name,
            repo_url: repo.html_url,
            summary: result.summary || '',
            techStack: result.techStack || [],
            complexity: (result.complexity as any) || 'beginner',
            domains: result.domains || [],
            highlights: result.highlights || [],
            raw_files: repo.keyFiles || [],
            analyzed_at: new Date().toISOString(),
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
}));
