import { create } from 'zustand';
import axios from 'axios';
import type { GitHubRepo } from '../types';

interface RepoState {
  repos: GitHubRepo[];
  loading: boolean;
  error: string | null;
  fetchRepos: (token: string) => Promise<void>;
  clearRepos: () => void;
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

export const useRepoStore = create<RepoState>((set) => ({
  repos: [],
  loading: false,
  error: null,
  clearRepos: () => set({ repos: [], error: null, loading: false }),
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
}));
