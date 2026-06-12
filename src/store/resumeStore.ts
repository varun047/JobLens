import { create } from 'zustand';
import type { ParsedResume } from '../types';
import { supabase } from '../lib/supabase';

interface ResumeState {
  resumeId: string | null;
  resume: ParsedResume | null;
  rawText: string;
  loading: boolean;
  error: string | null;
  setResume: (resume: ParsedResume) => void;
  setRawText: (text: string) => void;
  saveResume: (userId: string) => Promise<boolean>;
  fetchResume: (userId: string) => Promise<void>;
  clearResume: () => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumeId: null,
  resume: null,
  rawText: '',
  loading: false,
  error: null,
  setResume: (resume) => set({ resume }),
  setRawText: (rawText) => set({ rawText }),
  clearResume: () =>
    set({
      resumeId: null,
      resume: null,
      rawText: '',
      error: null,
      loading: false,
    }),
  fetchResume: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        set({
          resumeId: data.id,
          rawText: data.parsed_data?.rawText || '',
          resume: data.parsed_data as ParsedResume,
        });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch resume.' });
    } finally {
      set({ loading: false });
    }
  },
  saveResume: async (userId: string) => {
    const { resume, rawText, resumeId } = get();
    if (!resume) {
      set({ error: 'No resume content to save.' });
      return false;
    }
    set({ loading: true, error: null });
    try {
      const parsedData: ParsedResume = {
        ...resume,
        rawText,
      };

      if (resumeId) {
        const { error } = await supabase
          .from('resumes')
          .update({
            parsed_data: parsedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resumeId);
        if (error) throw error;
      } else {
        // Check database directly in case resumeId was not loaded in state
        const { data: existing } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('resumes')
            .update({
              parsed_data: parsedData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (error) throw error;
          set({ resumeId: existing.id });
        } else {
          const { data, error } = await supabase
            .from('resumes')
            .insert({
              user_id: userId,
              parsed_data: parsedData,
            })
            .select()
            .single();
          if (error) throw error;
          if (data) set({ resumeId: data.id });
        }
      }
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to save resume.' });
      return false;
    } finally {
      set({ loading: false });
    }
  },
}));
