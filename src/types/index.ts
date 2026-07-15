export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatar_url: string;
  provider_token?: string; // GitHub Access Token for API requests
}

export interface Experience {
  company: string;
  role: string;
  location?: string;
  duration: string;
  bullets: string[];
}

export interface Project {
  name: string;
  tech: string[];
  bullets: string[];
  link?: string;
  liveDemo?: string;
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
  grade?: string;      // CGPA, percentage
  coursework?: string[]; // relevant coursework
}

export interface SkillCategory {
  category: 'Frontend' | 'Backend' | 'Tools' | 'Languages' | 'Other';
  skills: string[];
}

export interface Position {
  title: string;
  organization: string;
  duration: string;
  description: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year?: string;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
  skills: string[];              // keep for backward compat with old data
  skillCategories?: SkillCategory[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  achievements?: string[];
  positions?: Position[];
  certifications?: Certification[];
  rawText?: string;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  html_url: string;
  readme?: string; // Decoded README markdown text
  languages?: Record<string, number>;
  fileTree?: string[];
  keyFiles?: { path: string; content: string }[];
  hasReadme?: boolean;
  owner?: string;
}

export interface RankedProject {
  name: string;
  reason: string;
  relevanceScore: number;
}

export interface CareerAdvice {
  strengths: string[];
  gaps: string[];
  actionItem: string;
  interviewTopics: string[];
}

export interface RepoAnalysis {
  id?: string;
  user_id?: string;
  repo_name: string;
  repo_url: string;
  summary: string;
  techStack: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  highlights: string[];
  domains: string[];
  raw_files?: any[];
  analyzed_at?: string;
  isEmpty?: boolean;
}

export interface HistoryAnalysis {
  id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  jd_text: string;
  tailored_resume: ParsedResume;
  ats_score: { before: number; after: number };
  missing_keywords: string[];
  career_advice: CareerAdvice;
  created_at: string;
}

export interface JDIntelligence {
  requiredSkills: string[];
  preferredSkills: string[];
  seniority: 'fresher' | 'junior' | 'mid' | 'senior';
  companyType: 'startup' | 'enterprise' | 'product' | 'service' | 'unknown';
  keyActionWords: string[];
  dailyResponsibilities: string[];
}

export interface ATSBreakdown {
  keywordMatch: number;      // 0-100
  bulletQuality: number;     // 0-100
  quantification: number;    // 0-100
  sectionsComplete: number;  // 0-100
  achievementsPresent: number; // 0-100
}

