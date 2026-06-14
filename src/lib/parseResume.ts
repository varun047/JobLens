import type { ParsedResume } from '../types';
import { extractJSON } from './extractJSON';

export async function parseResume(text: string): Promise<ParsedResume> {
  const prompt = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks, no 'Here are' or any text before or after. Start your response with { and end with }. Nothing else.

Schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "linkedin": "string or null",
  "github": "string or null",
  "skills": ["string"],
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }],
  "projects": [{ "name": "string", "tech": ["string"], "bullets": ["string"], "link": "string or null" }],
  "education": [{ "institution": "string", "degree": "string", "year": "string" }],
  "achievements": ["string"]
}

Also extract:
- linkedin: LinkedIn profile URL if present
- github: GitHub profile URL if present  
- achievements: array of achievement/responsibility strings
  (look for sections like 'Achievements', 'Responsibilities', 
   'Extra-Curricular', 'Positions of Responsibility')
- For each project, extract 'link' if a URL is mentioned

Return these in the JSON schema.

Resume text:
${text}`;

  const response = await fetch('http://localhost:11434/api/chat', {
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
