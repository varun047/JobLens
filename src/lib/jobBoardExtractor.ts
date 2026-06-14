export interface ExtractedJob {
  title: string
  company: string
  description: string
  source: 'linkedin' | 'indeed' | 'manual'
}

export async function extractJobFromUrl(url: string): Promise<ExtractedJob> {
  const trimmed = url.trim()

  if (!trimmed.startsWith('http')) {
    throw new Error('Please enter a valid URL starting with http or https')
  }

  if (trimmed.includes('linkedin.com/jobs')) {
    return handleLinkedIn(trimmed)
  }

  if (trimmed.includes('indeed.com')) {
    return await handleIndeed(trimmed)
  }

  // Generic URL — try to fetch via proxy
  return await handleGenericUrl(trimmed)
}

function handleLinkedIn(url: string): ExtractedJob {
  // LinkedIn blocks scraping — guide user
  const jobIdMatch = url.match(/\/(\d{10,})\/?/)
  const jobId = jobIdMatch?.[1] || 'unknown'

  return {
    title: '',
    company: '',
    description: `[LinkedIn Job ${jobId}]

LinkedIn prevents automatic extraction due to login requirements.

To get the job description:
1. Open this link: ${url}
2. Scroll to the job description section
3. Click "Show more" to expand it
4. Select all the text (Ctrl+A won't work — manually select)
5. Copy (Ctrl+C)
6. Paste into the JD textarea below

Tip: You can also copy just the job description section, not the entire page.`,
    source: 'linkedin'
  }
}

async function handleIndeed(url: string): Promise<ExtractedJob> {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })

    if (!response.ok) throw new Error('Could not fetch Indeed page')

    const html = await response.text()

    // Extract title
    const titleMatch =
      html.match(/<h1[^>]*jobsearch[^>]*>([^<]+)<\/h1>/i) ||
      html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const title = titleMatch?.[1]?.trim() || ''

    // Extract company
    const companyMatch =
      html.match(/data-company-name="([^"]+)"/i) ||
      html.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)</i)
    const company = companyMatch?.[1]?.trim() || ''

    // Extract description
    const descMatch =
      html.match(/id="jobDescriptionText"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/class="[^"]*jobDescription[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

    if (!descMatch?.[1]) {
      throw new Error('Description not found')
    }

    const description = descMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return { title, company, description, source: 'indeed' }
  } catch (err: any) {
    throw new Error(
      'Could not extract from Indeed automatically. Please copy-paste the JD manually.'
    )
  }
}

async function handleGenericUrl(url: string): Promise<ExtractedJob> {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
    const html = await response.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.replace(/\s*[\|\-–]\s*.+$/, '').trim() || ''

    // Get main content text
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyHtml = bodyMatch?.[1] || html
    const text = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)

    if (text.length < 100) {
      throw new Error('Not enough content extracted')
    }

    return {
      title,
      company: '',
      description: text,
      source: 'manual'
    }
  } catch {
    throw new Error('Could not extract from this URL. Please paste the JD manually.')
  }
}
