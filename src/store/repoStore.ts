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
      }));

      // Fetch READMEs in parallel, ignoring errors (such as 404 for repos without a README)
      const readmePromises = reposData.map(async (repo: any, index: number) => {
        try {
          const readmeRes = await axios.get(
            `https://api.github.com/repos/${repo.owner.login}/${repo.name}/readme`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
          if (readmeRes.data && readmeRes.data.content) {
            parsedRepos[index].readme = decodeBase64Utf8(readmeRes.data.content);
          }
        } catch (err) {
          // README not found or inaccessible, default to empty string
          parsedRepos[index].readme = '';
        }
      });

      await Promise.all(readmePromises);

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
