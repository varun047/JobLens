import type { ParsedResume } from '../types';
import { extractJSON } from './extractJSON';

export async function parseResume(text: string): Promise<ParsedResume> {
  const prompt = `You must respond with ONLY a JSON object. No introduction, no explanation, no markdown, no backticks, no 'Here are' or any text before or after. Start your response with { and end with }. Nothing else.

Schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "skills": ["string"],
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }],
  "projects": [{ "name": "string", "tech": ["string"], "bullets": ["string"] }],
  "education": [{ "institution": "string", "degree": "string", "year": "string" }]
}

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
      stream: false
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
