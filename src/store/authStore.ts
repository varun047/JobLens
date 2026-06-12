import { create } from 'zustand';
import type { AuthUser } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  login: async () => {
    try {
      set({ error: null, loading: true });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
          scopes: 'repo read:user',
        },
      });
      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  logout: async () => {
    try {
      set({ error: null, loading: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('gh_provider_token');
      set({ user: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  setSession: (session) => {
    if (session?.user) {
      let token = session.provider_token;
      if (token) {
        localStorage.setItem('gh_provider_token', token);
      } else {
        token = localStorage.getItem('gh_provider_token') || undefined;
      }
      set({
        user: {
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.user_name ||
            'GitHub User',
          avatar_url: session.user.user_metadata?.avatar_url || '',
          provider_token: token,
        },
        loading: false,
      });
    } else {
      localStorage.removeItem('gh_provider_token');
      set({ user: null, loading: false });
    }
  },
  setLoading: (loading) => set({ loading }),
}));
