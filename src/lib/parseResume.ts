import type { ParsedResume } from '../types';

export async function parseResume(text: string): Promise<ParsedResume> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'VITE_GROQ_API_KEY is not configured in your .env file.'
    );
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: `Parse this resume and return ONLY raw JSON, no markdown, no backticks, no explanation.

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
${text}`,
          },
        ],
        temperature: 0,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Groq API request failed: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();

  if (
    !data.choices ||
    data.choices.length === 0 ||
    !data.choices[0].message ||
    !data.choices[0].message.content
  ) {
    throw new Error('Invalid response structure from Groq API.');
  }

  const rawText = data.choices[0].message.content;
  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean) as ParsedResume;
}
