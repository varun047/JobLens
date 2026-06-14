import { supabase } from './supabase';

export async function saveDraft(
  userId: string,
  draftData: {
    jdText: string;
    company: string;
    jobTitle: string;
    rankedProjects: any[];
    tailoredResume: any;
    atsScore: any;
    careerAdvice: any;
    stepCompleted: number;
  }
) {
  try {
    const { error } = await supabase
      .from('analysis_drafts')
      .upsert(
        {
          user_id: userId,
          jd_text: draftData.jdText,
          company_name: draftData.company,
          job_title: draftData.jobTitle,
          ranked_projects: draftData.rankedProjects,
          tailored_resume: draftData.tailoredResume,
          ats_score: draftData.atsScore,
          career_advice: draftData.careerAdvice,
          step_completed: draftData.stepCompleted,
          last_saved_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) throw error;
    console.log('Draft saved to Supabase');
  } catch (err) {
    console.error('Failed to save draft:', err);
    // Don't block UI if Supabase save fails
  }
}

export async function loadDraft(userId: string) {
  try {
    const { data, error } = await supabase
      .from('analysis_drafts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error('Failed to load draft:', err);
    return null;
  }
}

export async function deleteDraft(userId: string) {
  try {
    const { error } = await supabase
      .from('analysis_drafts')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    console.log('Draft deleted from Supabase');
  } catch (err) {
    console.error('Failed to delete draft:', err);
  }
}
