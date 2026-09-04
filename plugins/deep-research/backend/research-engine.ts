/**
 * Deep Research Engine — searches the web, fetches pages, scores sources,
 * and compiles structured reports with citations using Claude AI.
 *
 * Works entirely server-side using Node.js fetch. No API keys required for
 * search (uses DuckDuckGo HTML); ANTHROPIC_API_KEY needed for AI synthesis.
 */

import type { FileStoreRecord } from '../../../backend/src/lib/file-store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  credibility_score: number;
  domain: string;
  fetched_at?: string;
  used_in_report: boolean;
  fetch_error?: string;
}

export interface ResearchStats {
  total_sources: number;
  sources_analyzed: number;
  queries_executed: number;
}

export interface ResearchSession extends FileStoreRecord {
  topic: string;
  description: string;
  strategy: 'breadth' | 'depth';
  status: 'queued' | 'researching' | 'compiling' | 'completed' | 'failed';
  queries: string[];
  sources: ResearchSource[];
  report: string;
  error: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  stats: ResearchStats;
}

// ---------------------------------------------------------------------------
// Domain credibility scoring
// ---------------------------------------------------------------------------

const DOMAIN_SCORES: Record<string, number> = {
  // Academic & research
  'arxiv.org': 95,
  'scholar.google.com': 95,
  'pubmed.ncbi.nlm.nih.gov': 95,
  'nature.com': 95,
  'science.org': 95,
  'ieee.org': 90,
  'acm.org': 90,
  'jstor.org': 90,
  // Government
  'gov': 90,
  'edu': 85,
  // Reference
  'wikipedia.org': 75,
  'britannica.com': 80,
  'stackoverflow.com': 75,
  // Major news
  'reuters.com': 85,
  'apnews.com': 85,
  'bbc.com': 80,
  'bbc.co.uk': 80,
  'nytimes.com': 80,
  'washingtonpost.com': 80,
  'theguardian.com': 78,
  // Tech
  'github.com': 75,
  'docs.python.org': 85,
  'developer.mozilla.org': 85,
  'w3.org': 90,
  // Business / finance
  'sec.gov': 90,
  'bloomberg.com': 80,
  'ft.com': 80,
};

function scoreDomain(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Exact domain match
    if (DOMAIN_SCORES[hostname]) return DOMAIN_SCORES[hostname];
    // TLD match (e.g. .gov, .edu)
    const tld = hostname.split('.').pop() ?? '';
    if (DOMAIN_SCORES[tld]) return DOMAIN_SCORES[tld];
    // Partial domain match (e.g. *.gov)
    for (const [domain, score] of Object.entries(DOMAIN_SCORES)) {
      if (hostname.endsWith(`.${domain}`) || hostname === domain) return score;
    }
    // Default score based on heuristics
    if (hostname.includes('blog')) return 55;
    if (hostname.includes('wiki')) return 65;
    if (hostname.includes('news')) return 70;
    return 60;
  } catch {
    return 50;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Web search via DuckDuckGo HTML
// ---------------------------------------------------------------------------

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

async function searchWeb(query: string, maxResults = 10): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`[research] DuckDuckGo search failed: ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseDuckDuckGoResults(html, maxResults);
  } catch (err) {
    console.error('[research] Search error:', err);
    return [];
  }
}

function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML results are in <a class="result__a" href="...">title</a>
  // with snippets in <a class="result__snippet" ...>snippet text</a>
  const resultBlocks = html.split(/class="result\s/g).slice(1);

  for (const block of resultBlocks) {
    if (results.length >= maxResults) break;

    // Extract URL from result__a href
    const urlMatch = block.match(/class="result__a"[^>]*href="([^"]+)"/);
    // Extract title text
    const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
    // Extract snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

    if (urlMatch && titleMatch) {
      let resultUrl = urlMatch[1];
      // DuckDuckGo wraps URLs in a redirect — extract the actual URL
      const uddgMatch = resultUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        resultUrl = decodeURIComponent(uddgMatch[1]);
      }

      // Skip non-HTTP URLs
      if (!resultUrl.startsWith('http')) continue;

      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : '';

      results.push({
        url: resultUrl,
        title: titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
        snippet,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Page content extraction
// ---------------------------------------------------------------------------

async function fetchPageContent(url: string, maxChars = 8000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) return '';

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return '';
    }

    const html = await response.text();
    return stripHtmlToText(html).slice(0, maxChars);
  } catch {
    return '';
  }
}

function stripHtmlToText(html: string): string {
  return (
    html
      // Remove script and style blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

// ---------------------------------------------------------------------------
// Anthropic API helper
// ---------------------------------------------------------------------------

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set — cannot generate research queries or reports');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  return (
    data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('') || ''
  );
}

// ---------------------------------------------------------------------------
// Query generation
// ---------------------------------------------------------------------------

async function generateSearchQueries(
  topic: string,
  strategy: 'breadth' | 'depth',
  count: number
): Promise<string[]> {
  const strategyPrompt =
    strategy === 'breadth'
      ? 'Generate diverse search queries that cover different aspects and angles of the topic for a broad overview.'
      : 'Generate focused, specific search queries that dig deep into the details, technical aspects, and nuances of the topic.';

  const prompt = `Generate ${count} web search queries for researching the following topic.
${strategyPrompt}

Topic: ${topic}

Return ONLY a JSON array of strings, nothing else. Example: ["query 1", "query 2"]`;

  try {
    const result = await callClaude(
      'You are a research assistant that generates effective web search queries. Return only valid JSON.',
      prompt,
      500
    );

    // Parse JSON array from response
    const match = result.match(/\[[\s\S]*\]/);
    if (match) {
      const queries = JSON.parse(match[0]) as string[];
      return queries.filter((q) => typeof q === 'string' && q.trim().length > 0);
    }
    return [topic]; // Fallback
  } catch (err) {
    console.error('[research] Failed to generate queries:', err);
    // Fallback: use the topic directly with some variations
    return [
      topic,
      `${topic} overview`,
      `${topic} latest research`,
      `${topic} explained`,
    ].slice(0, count);
  }
}

// ---------------------------------------------------------------------------
// Report compilation
// ---------------------------------------------------------------------------

async function compileReport(
  topic: string,
  sources: ResearchSource[]
): Promise<string> {
  const analyzedSources = sources.filter((s) => s.content && !s.fetch_error);

  if (analyzedSources.length === 0) {
    return `# Research Report: ${topic}\n\n*No sources could be analyzed. Try a different topic or check your internet connection.*`;
  }

  // Build source context for Claude (capped at ~60K chars)
  let sourceContext = '';
  let charCount = 0;
  const maxChars = 60000;

  for (let i = 0; i < analyzedSources.length; i++) {
    const src = analyzedSources[i];
    const entry = `\n--- Source [${i + 1}] ---\nURL: ${src.url}\nTitle: ${src.title}\nCredibility: ${src.credibility_score}/100\nContent:\n${src.content}\n`;
    if (charCount + entry.length > maxChars) break;
    sourceContext += entry;
    charCount += entry.length;
  }

  const systemPrompt = `You are a research analyst who produces comprehensive, well-cited reports.
Your reports are structured with clear sections, use inline citations in the format [1], [2] etc.,
and include a References section at the end with numbered URLs.
Write in a professional but accessible style. Be thorough and analytical.
Every factual claim should cite its source using the numbered citation format.`;

  const userPrompt = `Research Topic: ${topic}

I've gathered the following sources. Compile a comprehensive research report with:

1. An executive summary (2-3 paragraphs)
2. Key findings organized by theme/subtopic (use ## headings)
3. Analysis and implications
4. Areas needing further research
5. References section with numbered citations

Sources:
${sourceContext}

Generate the full markdown report now.`;

  return callClaude(systemPrompt, userPrompt, 8192);
}

// ---------------------------------------------------------------------------
// Main research execution
// ---------------------------------------------------------------------------

export type SessionUpdater = (
  id: string,
  updates: Partial<ResearchSession>
) => Promise<void>;

/**
 * Run a deep research session end-to-end. Updates the session store
 * as it progresses through each phase.
 */
export async function executeResearch(
  session: ResearchSession,
  updateSession: SessionUpdater
): Promise<void> {
  const startTime = Date.now();

  try {
    // Phase 1: Generate search queries
    await updateSession(session.id, {
      status: 'researching',
      started_at: new Date().toISOString(),
    });

    const queryCount = session.strategy === 'breadth' ? 8 : 5;
    const queries = await generateSearchQueries(session.topic, session.strategy, queryCount);

    await updateSession(session.id, { queries });

    // Phase 2: Execute searches
    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      const results = await searchWeb(query, 8);
      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
      // Small delay between searches
      await sleep(500);
    }

    // Build initial sources list
    const sources: ResearchSource[] = allResults.map((r) => ({
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      credibility_score: scoreDomain(r.url),
      domain: extractDomain(r.url),
      used_in_report: false,
    }));

    // Sort by credibility score (highest first)
    sources.sort((a, b) => b.credibility_score - a.credibility_score);

    // Limit to top sources
    const maxSources = session.strategy === 'breadth' ? 20 : 12;
    const topSources = sources.slice(0, maxSources);

    await updateSession(session.id, {
      sources: topSources,
      stats: {
        total_sources: topSources.length,
        sources_analyzed: 0,
        queries_executed: queries.length,
      },
    });

    // Phase 3: Fetch page content for top sources
    let analyzedCount = 0;
    for (const source of topSources) {
      const content = await fetchPageContent(source.url);
      if (content) {
        source.content = content;
        source.fetched_at = new Date().toISOString();
        analyzedCount++;
      } else {
        source.fetch_error = 'Failed to fetch or extract content';
      }

      // Update progress periodically
      if (analyzedCount % 3 === 0 || analyzedCount === topSources.length) {
        await updateSession(session.id, {
          sources: topSources,
          stats: {
            total_sources: topSources.length,
            sources_analyzed: analyzedCount,
            queries_executed: queries.length,
          },
        });
      }

      await sleep(300);
    }

    // Phase 4: Compile report
    await updateSession(session.id, { status: 'compiling' });

    const report = await compileReport(session.topic, topSources);

    // Mark which sources were cited in the report
    for (const source of topSources) {
      source.used_in_report = report.includes(source.url) || report.includes(source.title);
    }

    // Complete
    const endTime = Date.now();
    await updateSession(session.id, {
      status: 'completed',
      report,
      sources: topSources,
      completed_at: new Date().toISOString(),
      duration_ms: endTime - startTime,
      stats: {
        total_sources: topSources.length,
        sources_analyzed: analyzedCount,
        queries_executed: queries.length,
      },
    });

    console.log(
      `[research] Completed research "${session.topic}" — ${topSources.length} sources, ${queries.length} queries, ${Math.round((endTime - startTime) / 1000)}s`
    );
  } catch (err) {
    const endTime = Date.now();
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[research] Failed research "${session.topic}":`, errorMessage);

    await updateSession(session.id, {
      status: 'failed',
      error: errorMessage,
      completed_at: new Date().toISOString(),
      duration_ms: endTime - startTime,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
