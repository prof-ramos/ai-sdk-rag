/**
 * Web Search functionality for the chatbot
 * This implementation uses a simple web scraping approach
 * For production, consider using Tavily, Brave Search API, or Serper API
 */

// Retry configuration - ensures worst-case stays under 30s API route limit
// Worst case: 7s + 1s + 7s + 2s + 7s = 24s (leaves 6s buffer)
const MAX_RETRIES = 2; // 3 total attempts
const TIMEOUT_MS = 7000; // 7 seconds per attempt
const BACKOFF_DELAYS = [1000, 2000]; // 1s, 2s between retries

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if we've exhausted all attempts
      if (attempt === retries) {
        break;
      }

      // Log the retry attempt
      console.log(
        `Search attempt ${attempt + 1} failed, retrying in ${BACKOFF_DELAYS[attempt]}ms...`,
        error,
      );

      // Wait before retrying (exponential backoff)
      await sleep(BACKOFF_DELAYS[attempt] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1]);
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new Error("Search operation failed");
}

/**
 * Search the web for information
 * @param query - The search query
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of search results
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5,
): Promise<SearchResult[]> {
  try {
    return await withRetry(async () => {
      // For now, using DuckDuckGo HTML search as a simple alternative
      // This is a basic implementation - for production use a proper API
      const encodedQuery = encodeURIComponent(query);
      const response = await fetchWithTimeout(
        `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
        TIMEOUT_MS,
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const html = await response.text();

      // Parse the HTML response to extract search results
      const results: SearchResult[] = [];

      // Basic regex parsing (not ideal but works for demo purposes)
      const resultPattern =
        /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)/g;

      let match;
      while (
        (match = resultPattern.exec(html)) !== null &&
        results.length < maxResults
      ) {
        const url = match[1].replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "");
        const decodedUrl = decodeURIComponent(url);

        results.push({
          url: decodedUrl,
          title: match[2].trim(),
          snippet: match[3].trim().replace(/&[^;]+;/g, "").substring(0, 200),
        });
      }

      return results;
    });
  } catch (error) {
    console.error("Web search error after all retries:", error);
    return [];
  }
}

/**
 * Format search results for display to the AI model
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }

  return results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}\n`,
    )
    .join("\n");
}
