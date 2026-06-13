import type { ParsedResume } from '../types';

export async function parseResume(text: string): Promise<ParsedResume> {
  const prompt = `Parse this resume and return ONLY raw JSON, no markdown, no backticks, no explanation.

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
      messages: [{ role: 'user', content: prompt }],
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
  const clean = textContent.replace(/```json|```/gi, '').trim();
  return JSON.parse(clean) as ParsedResume;
}
