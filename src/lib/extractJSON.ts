export function extractJSON(text: string): any {
  // Try direct parse
  try { return JSON.parse(text); } catch {}

  // Strip markdown
  const stripped = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(stripped); } catch {}

  // Find outermost { }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }

  // Auto-repair truncated JSON
  if (start !== -1) {
    let truncated = text.slice(start);
    
    // Close any open strings
    const quoteCount = (truncated.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      truncated += '"';
    }
    
    // Close open arrays
    const openArrays = (truncated.match(/\[/g) || []).length - 
                       (truncated.match(/\]/g) || []).length;
    truncated += ']'.repeat(Math.max(0, openArrays));
    
    // Close open objects
    const openObjects = (truncated.match(/\{/g) || []).length - 
                        (truncated.match(/\}/g) || []).length;
    truncated += '}'.repeat(Math.max(0, openObjects));
    
    try { return JSON.parse(truncated); } catch {}
  }

  throw new Error(
    'Could not extract valid JSON from response: ' + text.slice(0, 100)
  );
}
