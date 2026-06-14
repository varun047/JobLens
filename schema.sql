-- Supabase Database Schema for JobLens

-- 1. Create public.users table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create Policies for public.users
CREATE POLICY "Users can view their own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- 2. Create public.resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parsed_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own resume"
ON public.resumes FOR ALL
USING (auth.uid() = user_id);

-- 3. Automatic user sync from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name', 'GitHub User'),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create public.repo_analyses table
CREATE TABLE IF NOT EXISTS public.repo_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_name text NOT NULL,
  repo_url text,
  summary text,
  tech_stack jsonb DEFAULT '[]',
  complexity text,
  domains jsonb DEFAULT '[]',
  highlights jsonb DEFAULT '[]',
  raw_files jsonb DEFAULT '[]',
  analyzed_at timestamptz DEFAULT now()
);

ALTER TABLE public.repo_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own analyses"
ON public.repo_analyses FOR ALL
USING (auth.uid() = user_id);

-- 5. Create public.analyses table (Week 3 Analytics History)
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title text,
  company_name text,
  jd_text text,
  tailored_resume jsonb,
  ats_score jsonb, -- { before: number, after: number }
  missing_keywords jsonb DEFAULT '[]',
  career_advice jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own analyses"
ON public.analyses FOR ALL
USING (auth.uid() = user_id);

-- 6. Create public.analysis_drafts table (Analysis progress drafts)
CREATE TABLE IF NOT EXISTS public.analysis_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  jd_text text,
  company_name text,
  job_title text,
  ranked_projects jsonb,
  tailored_resume jsonb,
  ats_score jsonb,
  career_advice jsonb,
  step_completed integer DEFAULT 0,
  last_saved_at timestamptz DEFAULT now()
);

ALTER TABLE public.analysis_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own drafts"
ON public.analysis_drafts FOR ALL
USING (auth.uid() = user_id);

-- 7. Create public.analysis_history table (Analyses history log)
CREATE TABLE IF NOT EXISTS public.analysis_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  job_title text,
  jd_text text,
  ranked_projects jsonb DEFAULT '[]',
  tailored_resume jsonb,
  ats_score jsonb,
  missing_keywords jsonb DEFAULT '[]',
  career_advice jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own history"
ON public.analysis_history FOR ALL
USING (auth.uid() = user_id);
