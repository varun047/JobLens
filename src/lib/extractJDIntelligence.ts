export interface JDIntelligence {
  roleTitle: string;
  seniority: 'fresher' | 'junior' | 'mid' | 'senior';
  requiredSkills: string[];
  preferredSkills: string[];
  keyActionWords: string[];
  responsibilities: string[];
  industrySignals: string[];
  companySize: 'startup' | 'mid-size' | 'enterprise' | 'unknown';
}

export async function extractJDIntelligence(
  jdText: string
): Promise<JDIntelligence> {
  const ollamaUrl = (import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content: 'You are a recruitment expert. Output only valid JSON.'
        },
        {
          role: 'user',
          content: `Analyze this job description and extract key intelligence.
          
Return ONLY raw JSON:
{
  "roleTitle": string,
  "seniority": "fresher" | "junior" | "mid" | "senior",
  "requiredSkills": string[],
  "preferredSkills": string[],
  "keyActionWords": string[],
  "responsibilities": string[],
  "industrySignals": string[],
  "companySize": "startup" | "mid-size" | "enterprise" | "unknown"
}

Job Description:
${jdText.slice(0, 1500)}`
        }
      ],
      stream: false,
      options: { num_predict: 1000, temperature: 0 }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama JD intelligence extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const { extractJSON } = await import('./extractJSON');
  return extractJSON(data.message.content) as JDIntelligence;
}
