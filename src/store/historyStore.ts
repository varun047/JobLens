import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface AnalysisHistory {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  jd_text: string;
  ranked_projects: any[];
  tailored_resume: any;
  ats_score: { before: number; after: number };
  missing_keywords: string[];
  career_advice: any;
  created_at: string;
}

interface HistoryState {
  analyses: AnalysisHistory[];
  history: AnalysisHistory[]; // alias for compatibility
  selectedAnalysis: AnalysisHistory | null;
  loading: boolean;
  error: string | null;
  fetchHistory: (userId: string) => Promise<void>;
  saveAnalysis: (
    userId: string,
    data: Omit<AnalysisHistory, 'id' | 'user_id' | 'created_at'>
  ) => Promise<AnalysisHistory>;
  deleteAnalysis: (id: string) => Promise<void>;
  setSelectedAnalysis: (analysis: AnalysisHistory | null) => void;
  addAnalysis: (analysis: Omit<AnalysisHistory, 'id' | 'created_at'>) => Promise<void>; // alias
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  analyses: [] as AnalysisHistory[],
  history: [] as AnalysisHistory[],
  selectedAnalysis: null as AnalysisHistory | null,
  loading: false,
  error: null as string | null,

  // Fetch all analyses for current user
  fetchHistory: async (userId: string) => {
    if (!userId) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = data || [];
      set({ analyses: mapped, history: mapped, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Failed to fetch history:', err);
    }
  },

  // Save new analysis
  saveAnalysis: async (
    userId: string,
    data: Omit<AnalysisHistory, 'id' | 'user_id' | 'created_at'>
  ) => {
    try {
      const { data: savedData, error } = await supabase
        .from('analysis_history')
        .insert([
          {
            user_id: userId,
            company_name: data.company_name,
            job_title: data.job_title,
            jd_text: data.jd_text,
            ranked_projects: data.ranked_projects,
            tailored_resume: data.tailored_resume,
            ats_score: data.ats_score,
            missing_keywords: data.missing_keywords,
            career_advice: data.career_advice,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const updatedAnalyses = [savedData, ...get().analyses];
      set({
        analyses: updatedAnalyses,
        history: updatedAnalyses,
      });

      return savedData;
    } catch (err: any) {
      console.error('Failed to save analysis:', err);
      throw err;
    }
  },

  // Delete analysis
  deleteAnalysis: async (id: string) => {
    try {
      const { error } = await supabase
        .from('analysis_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedAnalyses = get().analyses.filter((a) => a.id !== id);
      set({
        analyses: updatedAnalyses,
        history: updatedAnalyses,
        selectedAnalysis:
          get().selectedAnalysis?.id === id ? null : get().selectedAnalysis,
      });
    } catch (err: any) {
      console.error('Failed to delete analysis:', err);
      throw err;
    }
  },

  // Select analysis to view
  setSelectedAnalysis: (analysis: AnalysisHistory | null) => {
    set({ selectedAnalysis: analysis });
  },

  // Compatibility helper
  addAnalysis: async (analysis: any) => {
    await get().saveAnalysis(analysis.user_id, {
      company_name: analysis.company_name,
      job_title: analysis.job_title,
      jd_text: analysis.jd_text,
      ranked_projects: analysis.ranked_projects || [],
      tailored_resume: analysis.tailored_resume,
      ats_score: analysis.ats_score,
      missing_keywords: analysis.missing_keywords || [],
      career_advice: analysis.career_advice,
    });
  },
}));
