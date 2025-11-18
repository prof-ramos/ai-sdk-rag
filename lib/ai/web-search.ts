/**
 * Web Search functionality for the chatbot using the Perplexity API
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface PerplexityChoice {
  message?: {
    content?: string;
  };
}

interface PerplexityResponse {
  choices?: PerplexityChoice[];
}

/**
 * Search the web for information using Perplexity's online model
 * @param query - The search query
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of search results
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5,
): Promise<SearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.error("PERPLEXITY_API_KEY is not set.");
    return [];
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "pplx-70b-online",
        messages: [
          {
            role: "system",
            content:
              "You are a search aggregator. Return ONLY valid JSON, never add prose. JSON should be an array of objects with title, url, and snippet keys.",
          },
          {
            role: "user",
            content: `Search the web for "${query}" and return up to ${maxResults} concise results with title, url, and snippet fields.`,
          },
        ],
        temperature: 0,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error("Perplexity search failed:", await response.text());
      return [];
    }

    const data = (await response.json()) as PerplexityResponse;
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Perplexity search returned no content");
      return [];
    }

    const parsed = parseSearchContent(content);
    const normalizedResults = normalizeResults(parsed).slice(0, maxResults);

    return normalizedResults;
  } catch (error) {
    console.error("Web search error:", error);
    return [];
  }
}

function parseSearchContent(content: string): unknown {
  const cleaned = content.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse Perplexity search content as JSON:", error);
    const fallbackMatch = cleaned.match(/\[[\s\S]*\]/);
    if (fallbackMatch) {
      try {
        return JSON.parse(fallbackMatch[0]);
      } catch (nestedError) {
        console.error("Fallback JSON parse failed:", nestedError);
      }
    }
    return [];
  }
}

function normalizeResults(data: unknown): SearchResult[] {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { results?: unknown[] })?.results)
      ? (data as { results: unknown[] }).results
      : [];

  return items
    .map((item) => {
      const entry = item as {
        title?: string;
        url?: string;
        link?: string;
        snippet?: string;
        text?: string;
      };

      if (!(entry.title && (entry.url || entry.link))) return null;

      return {
        title: entry.title.trim(),
        url: (entry.url ?? entry.link ?? "").trim(),
        snippet: (entry.snippet ?? entry.text ?? "").trim().slice(0, 200),
      } satisfies SearchResult;
    })
    .filter((result): result is SearchResult => Boolean(result));
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
