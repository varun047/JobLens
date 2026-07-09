import type { ParsedResume } from '../types';
import { extractJSON } from './extractJSON';

export async function parseResume(text: string): Promise<ParsedResume> {
  const prompt = `Parse this resume completely. Extract EVERY piece of information.

Return ONLY raw JSON matching this schema exactly:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "linkedin": "string or ''",
  "github": "string or ''",
  "portfolio": "string or ''",
  "summary": "string or ''",
  "skills": ["string"],
  "skillCategories": [
    { "category": "string", "skills": ["string"] }
  ],
  "experience": [{
    "company": "string",
    "role": "string",
    "location": "string or ''",
    "duration": "string",
    "bullets": ["string"]
  }],
  "projects": [{
    "name": "string",
    "tech": ["string"],
    "link": "string or ''",
    "liveDemo": "string or ''",
    "bullets": ["string"]
  }],
  "education": [{
    "institution": "string",
    "degree": "string",
    "year": "string",
    "grade": "string or ''",
    "coursework": ["string"]
  }],
  "achievements": ["string"],
  "positions": ["string"],
  "certifications": ["string"]
}

For skillCategories, group skills into logical categories:
- Look for explicit category labels in resume (Programming:, Frontend:, Tools: etc)
- If no categories exist, infer them from the skills list

For achievements vs positions:
- achievements: awards, medals, competitions won
- positions: leadership roles held (captain, head, treasurer etc)

Resume text:
${text}`;

  const ollamaUrl = (import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. You only output valid JSON objects. Never output text, explanations, or markdown. Always start with { and end with }.'
        },
        { role: 'user', content: prompt }
      ],
      stream: false,
      options: {
        num_predict: 4000,
        temperature: 0
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama API request failed: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const textContent = data.message.content;
  return extractJSON(textContent) as ParsedResume;
}
