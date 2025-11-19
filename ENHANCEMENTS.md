# Sofia Chatbot RAG - Enhanced Features

This document describes the new capabilities added to the Sofia chatbot RAG system.

## New Features

### 1. Web Search Capability

**Location**: `lib/ai/web-search.ts` and `app/(preview)/api/chat/route.ts`

The chatbot now includes a web search tool that allows it to search the internet for current information, recent events, or facts not in its knowledge base.

**Features**:
- Simple web scraping implementation using DuckDuckGo HTML search
- Returns up to 5 search results by default (configurable)
- Extracts title, URL, and snippet from each result
- Graceful error handling

**Usage**: The AI automatically uses this tool when users ask about:
- Current events
- Recent information
- News
- Facts not in the knowledge base

**Retry Configuration**: The search includes retry logic with timeout controls to ensure requests complete within the API route's 30-second limit:
- Timeout per attempt: 7 seconds
- Maximum retries: 2 (3 total attempts)
- Backoff delays: 1s, 2s (exponential backoff)
- Worst-case timing: 7s + 1s + 7s + 2s + 7s = 24s (leaves 6s safety buffer)

**Production Note**: The current implementation uses a basic web scraping approach. For production deployments, consider using:
- Tavily Search API
- Brave Search API
- Serper API
- OpenRouter's built-in web search

### 2. Prompt Caching

**Location**: `app/(preview)/api/chat/route.ts:40-43`

Implemented prompt caching using OpenAI's ephemeral cache control to improve performance and reduce costs.

**Benefits**:
- Faster response times for repeated prompts
- Reduced API costs
- Better user experience

**Implementation**:

```typescript
experimental_providerMetadata: {
  openai: {
    cacheControl: { type: "ephemeral" },
  },
}
```

### 3. Multimodal Input Support (Images)

**Locations**:
- Frontend: `app/(preview)/page.tsx`
- Backend: Automatically handled by Vercel AI SDK

The chatbot now supports image uploads and can process visual information alongside text queries.

**Features**:
- Image file upload button with icon
- Preview of selected images before sending
- Support for multiple images in a single message
- Remove individual images from selection
- Automatic conversion to base64 data URLs
- Images sent as part of multimodal message

**UI Components**:
- File input with image icon button
- Image preview grid with thumbnails
- Delete button on hover for each image
- Responsive design with dark mode support

**Usage**: Users can:
1. Click the image icon to select images
2. Preview selected images
3. Remove unwanted images
4. Send text + images together
5. Ask questions about the uploaded images

**Model Support**: Works with vision-capable models like GPT-4o

## Updated Tool Indicators

The loading state now shows specific messages for each tool:
- "Getting information" - Searching knowledge base
- "Adding information" - Storing new knowledge
- "Searching the web" - Performing web search
- "Understanding your query" - Analyzing the question
- "Thinking" - Default state

## Technical Implementation Details

### Web Search

```typescript
searchWeb: tool({
  description: `search the web for current information...`,
  inputSchema: z.object({
    query: z.string().describe("the search query"),
    maxResults: z.number().optional(),
  }),
  execute: async ({ query, maxResults }) => {
    const results = await searchWeb(query, maxResults);
    return { query, results, summary: `Found ${results.length} results` };
  },
})
```

### Multimodal Messages

```typescript
const parts = [];
if (input.trim() !== "") {
  parts.push({ type: "text", text: input });
}
imageDataUrls.forEach((url) => {
  parts.push({ type: "image", image: url });
});
sendMessage({ parts });
```

## System Prompt Updates

Updated the system prompt to instruct the AI to:
- Use the searchWeb tool for current events and recent information
- Continue using the knowledge base for personal information
- Maintain existing behavior for resource management

## Dependencies

No new dependencies were added. All features use existing packages:
- Vercel AI SDK (`ai`, `@ai-sdk/react`)
- Lucide React (for icons)
- Existing UI components

## Testing Recommendations

1. **Web Search**: Test with queries about current events
2. **Prompt Caching**: Monitor API costs and response times
3. **Multimodal**: Upload various image types and ask questions
4. **Integration**: Test combining all features (text + image + web search)

## Future Enhancements

Consider adding:
- Video input support
- Audio transcription (using OpenAI Whisper)
- PDF document processing
- Professional search API integration (Tavily, Brave, etc.)
- OpenRouter integration for multi-model support
- Advanced prompt caching strategies
- Image OCR and analysis tools
- Voice input/output
