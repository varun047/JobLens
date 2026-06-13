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
  duration: string;
  bullets: string[];
}

export interface Project {
  name: string;
  tech: string[];
  bullets: string[];
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
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
