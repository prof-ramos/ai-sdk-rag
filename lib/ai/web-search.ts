/**
 * Web Search functionality for the chatbot using the Perplexity API
 *
 * This implementation uses Perplexity's Sonar model, which is specifically
 * designed for web search with structured responses and built-in citations.
 *
 * For more information: https://docs.perplexity.ai/guides/sonar-models
 */

// Configuration constants
const PERPLEXITY_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000; // 1 second base delay for exponential backoff

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface PerplexityMessage {
  role: string;
  content: string;
}

interface PerplexityCitation {
  url: string;
  text?: string;
}

interface PerplexityChoice {
  message?: {
    content?: string;
  };
  citations?: PerplexityCitation[];
}

interface PerplexityResponse {
  choices?: PerplexityChoice[];
  citations?: string[];
}

/**
 * Validates the structure of a Perplexity API response
 */
function isValidPerplexityResponse(data: unknown): data is PerplexityResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const response = data as PerplexityResponse;

  // Check if choices array exists and has at least one item
  if (!Array.isArray(response.choices) || response.choices.length === 0) {
    return false;
  }

  // Check if the first choice has a message with content
  const firstChoice = response.choices[0];
  if (!firstChoice?.message?.content) {
    return false;
  }

  return true;
}

/**
 * Sanitizes user input to prevent injection attacks and limit size
 */
function sanitizeQuery(query: string): string {
  // Remove potentially dangerous characters while keeping useful search syntax
  // Allow alphanumeric, spaces, hyphens, and common search operators
  return query
    .trim()
    .replace(/[<>{}]/g, "") // Remove potential HTML/code injection
    .slice(0, 500); // Limit query length
}

/**
 * Parses Perplexity's response and citations into SearchResult format
 */
function parsePerplexityResults(
  data: PerplexityResponse,
  maxResults: number,
): SearchResult[] {
  const results: SearchResult[] = [];

  const content = data.choices?.[0]?.message?.content;
  const citations = data.citations || [];

  if (!content) {
    return results;
  }

  // If we have citations array, use those as structured results
  if (citations && citations.length > 0) {
    citations.slice(0, maxResults).forEach((url, index) => {
      // Extract domain name for title if no better title available
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");

      results.push({
        title: `Result ${index + 1} from ${domain}`,
        url: url,
        snippet: content.slice(0, 200), // Use part of response as snippet
      });
    });

    return results;
  }

  // Fallback: Try to parse citations from choice-level citations
  const choiceCitations = data.choices?.[0]?.citations;
  if (choiceCitations && Array.isArray(choiceCitations)) {
    choiceCitations.slice(0, maxResults).forEach((citation) => {
      if (citation.url) {
        const urlObj = new URL(citation.url);
        const domain = urlObj.hostname.replace("www.", "");

        results.push({
          title: `Result from ${domain}`,
          url: citation.url,
          snippet: citation.text || content.slice(0, 200),
        });
      }
    });

    return results;
  }

  // Last resort: Return the content as a single result
  // This shouldn't happen with Sonar models, but provides graceful degradation
  if (results.length === 0 && content) {
    results.push({
      title: "Search Result",
      url: "https://www.perplexity.ai",
      snippet: content.slice(0, 200),
    });
  }

  return results;
}

/**
 * Sleep for specified milliseconds (used for retry backoff)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search the web for information using Perplexity's Sonar model
 *
 * This function uses Perplexity's Sonar API, which is specifically designed
 * for web search and returns structured results with citations.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request timeout protection
 * - Input sanitization
 * - Response validation
 * - Graceful error handling
 *
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
    console.error("PERPLEXITY_API_KEY is not configured in environment variables");
    return [];
  }

  // Sanitize input to prevent injection attacks
  const sanitizedQuery = sanitizeQuery(query);

  if (!sanitizedQuery) {
    console.error("Search query is empty after sanitization");
    return [];
  }

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Set up abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT);

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          // Use Sonar model for web search with structured citations
          // sonar-pro: More accurate, higher cost
          // sonar: Faster, lower cost
          model: "sonar",
          messages: [
            {
              role: "user",
              content: sanitizedQuery,
            },
          ] as PerplexityMessage[],
          // Return citations to get structured URLs
          return_citations: true,
          // Return related questions for potential future use
          return_related_questions: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const status = response.status;
        console.error(`Perplexity API request failed with status ${status} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);

        // Don't retry on client errors (4xx), only server errors (5xx) and network issues
        if (status >= 400 && status < 500) {
          console.error("Client error - not retrying");
          return [];
        }

        // Continue to retry logic below
        if (attempt < MAX_RETRIES) {
          continue;
        }

        return [];
      }

      // Parse JSON response
      const data = await response.json();

      // Validate response structure
      if (!isValidPerplexityResponse(data)) {
        console.error("Invalid Perplexity API response structure");

        if (attempt < MAX_RETRIES) {
          continue;
        }

        return [];
      }

      // Parse and return results
      const results = parsePerplexityResults(data, maxResults);

      if (results.length === 0) {
        console.warn("Perplexity search returned no results");
      }

      return results;

    } catch (error) {
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error(`Perplexity request timeout after ${PERPLEXITY_TIMEOUT}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        } else {
          console.error(`Perplexity search error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message);
        }
      } else {
        console.error(`Unknown error during Perplexity search (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      }

      // If this was the last attempt, give up
      if (attempt === MAX_RETRIES) {
        return [];
      }

      // Exponential backoff before retry: 1s, 2s, 4s...
      const backoffDelay = RETRY_DELAY_BASE * Math.pow(2, attempt);
      console.log(`Retrying in ${backoffDelay}ms...`);
      await sleep(backoffDelay);
    }
  }

  // Should never reach here, but TypeScript needs it
  return [];
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
