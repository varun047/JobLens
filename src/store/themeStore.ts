import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type AppTheme = 'emerald' | 'violet' | 'amber';

interface AppThemeState {
  selectedTheme: AppTheme;
  identityTitle: string;
  identityTagline: string;
  identityCompleted: boolean;
  setTheme: (theme: AppTheme) => void;
  setIdentity: (title: string, tagline: string) => void;
  setIdentityCompleted: (completed: boolean) => void;
  syncFromSupabase: (userId: string) => Promise<void>;
  saveIdentity: (
    userId: string,
    data: { title: string; tagline: string; theme: AppTheme }
  ) => Promise<void>;
}

export const useAppThemeStore = create<AppThemeState>((set) => ({
  selectedTheme: 'emerald',
  identityTitle: '',
  identityTagline: '',
  identityCompleted: false,

  setTheme: (theme) => {
    set({ selectedTheme: theme });
    document.documentElement.setAttribute('data-app-theme', theme);
  },

  setIdentity: (title, tagline) => {
    set({ identityTitle: title, identityTagline: tagline });
  },

  setIdentityCompleted: (completed) => {
    set({ identityCompleted: completed });
  },

  syncFromSupabase: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('identity_title, identity_tagline, selected_theme, identity_completed')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const theme = (data.selected_theme as AppTheme) || 'emerald';
        set({
          identityTitle: data.identity_title || '',
          identityTagline: data.identity_tagline || '',
          selectedTheme: theme,
          identityCompleted: !!data.identity_completed,
        });
        document.documentElement.setAttribute('data-app-theme', theme);
      }
    } catch (err) {
      console.error('Failed to sync theme/identity from Supabase:', err);
    }
  },

  saveIdentity: async (userId, { title, tagline, theme }) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          identity_title: title,
          identity_tagline: tagline,
          selected_theme: theme,
          identity_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;

      set({
        identityTitle: title,
        identityTagline: tagline,
        selectedTheme: theme,
        identityCompleted: true,
      });
      document.documentElement.setAttribute('data-app-theme', theme);
    } catch (err) {
      console.error('Failed to save identity to Supabase:', err);
      throw err;
    }
  },
}));
