/**
 * Web Search functionality for the chatbot
 * This implementation uses a simple web scraping approach
 * For production, consider using Tavily, Brave Search API, or Serper API
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
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
    // For now, using DuckDuckGo HTML search as a simple alternative
    // This is a basic implementation - for production use a proper API
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    if (!response.ok) {
      console.error("Search failed:", response.statusText);
      return [];
    }

    const html = await response.text();

    // Parse the HTML response to extract search results
    const results: SearchResult[] = [];

    // Basic regex parsing (not ideal but works for demo purposes)
    const resultPattern =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)/g;

    let match;
    while ((match = resultPattern.exec(html)) !== null && results.length < maxResults) {
      const url = match[1].replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "");
      const decodedUrl = decodeURIComponent(url);

      results.push({
        url: decodedUrl,
        title: match[2].trim(),
        snippet: match[3].trim().replace(/&[^;]+;/g, "").substring(0, 200),
      });
    }

    return results;
  } catch (error) {
    console.error("Web search error:", error);
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
