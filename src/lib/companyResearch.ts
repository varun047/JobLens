import { extractJSON } from './extractJSON';

export interface CompanyInsight {
  industry: string;
  culture: 'corporate' | 'startup' | 'creative' | 'technical';
  size: 'startup' | 'mid-size' | 'enterprise';
  recommendedStyle: 'classic' | 'modern' | 'minimal' | 'two-column';
  reason: string;
  colorScheme: 'black' | 'navy' | 'charcoal';
  tips: string[];
}

export async function researchCompany(
  company: string,
  jobTitle: string
): Promise<CompanyInsight> {
  const ollamaUrl = (import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content: 'You are a career expert. Output only valid JSON.'
        },
        {
          role: 'user',
          content: `Research ${company} and recommend the best resume style for a ${jobTitle} role there.

Consider:
- Is it a startup, mid-size, or enterprise company?
- What industry are they in?
- What is their culture (corporate, startup, creative, technical)?
- What resume style works best for their hiring culture?

Styles available:
- classic: Traditional single column, very ATS safe, best for banks/PSUs/enterprise
- modern: Single column with accent line, clean typography, best for tech startups
- minimal: Ultra clean whitespace design, best for design/product companies
- two-column: Skills sidebar + main content, best for technical roles at mid-size firms

Return ONLY raw JSON:
{
  "industry": string,
  "culture": "corporate" | "startup" | "creative" | "technical",
  "size": "startup" | "mid-size" | "enterprise",
  "recommendedStyle": "classic" | "modern" | "minimal" | "two-column",
  "reason": string (2 sentences explaining why this style),
  "colorScheme": "black" | "navy" | "charcoal",
  "tips": string[] (3 specific tips for applying to this company)
}`
        }
      ],
      stream: false,
      options: { num_predict: 1000, temperature: 0 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Company research failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return extractJSON(data.message.content) as CompanyInsight;
}
