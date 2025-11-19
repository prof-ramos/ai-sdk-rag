# Sofia Chatbot RAG - Enhanced AI Assistant

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnicoalbanese%2Fai-sdk-rag-template&env=OPENAI_API_KEY&envDescription=You%20will%20need%20an%20OPENAI%20API%20Key.&project-name=ai-sdk-rag&repository-name=ai-sdk-rag&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D&skippable-integrations=1)

A [Next.js](https://nextjs.org/) application powered by the Vercel AI SDK that uses retrieval-augmented generation (RAG) to reason and respond with information outside of the model's training data. Enhanced with web search, prompt caching, and multimodal input capabilities.

## Features

- Information retrieval and addition through tool calls using the [`streamText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) function
- Real-time streaming of model responses to the frontend using the [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) hook
- Vector embedding storage with [DrizzleORM](https://orm.drizzle.team/) and [PostgreSQL](https://www.postgresql.org/)
- Animated UI with [Framer Motion](https://www.framer.com/motion/)
- Web search capability for current events and recent information
- Prompt caching for improved performance and reduced costs
- Multimodal input support (images) for visual information processing

## Getting Started

To get the project up and running, follow these steps:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your Vercel AI Gateway API key, Perplexity API key, and PostgreSQL connection string to the `.env` file:

   ```
   AI_GATEWAY_API_KEY=your_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   DATABASE_URL=your_postgres_connection_string_here
   ```

   **Getting API Keys:**
   - **AI Gateway API Key**: Get from [Vercel AI Dashboard](https://vercel.com/docs/ai)
   - **Perplexity API Key**: Sign up at [Perplexity API](https://www.perplexity.ai/settings/api) (requires paid account for production use)
   - **Database URL**: Your PostgreSQL connection string

4. Migrate the database schema:

   ```bash
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

Your project should now be running on [http://localhost:3000](http://localhost:3000).

## Web Search Feature

The chatbot includes web search capabilities powered by Perplexity's Sonar API, allowing it to access current information and recent events beyond the AI model's training data.

### How It Works

- **Model**: Uses Perplexity's `sonar` model, specifically designed for web search with structured citations
- **Features**:
  - Automatic retry with exponential backoff for reliability
  - Request timeout protection (10 seconds)
  - Input sanitization for security
  - Response validation
  - Graceful error handling

### Configuration

1. **Get an API Key**: Sign up at [Perplexity API](https://www.perplexity.ai/settings/api)
2. **Add to Environment**: Set `PERPLEXITY_API_KEY` in your `.env` file
3. **Usage Costs**: Perplexity API is a paid service. Monitor your usage at their dashboard.

### Models Available

- **`sonar`**: Faster responses, lower cost (default)
- **`sonar-pro`**: More accurate results, higher cost

To switch models, edit `lib/ai/web-search.ts` and change the `model` parameter.

### Error Handling

If the web search fails or the API key is missing:
- The function returns an empty array
- Errors are logged to the server console
- The chatbot continues to function with RAG-only capabilities

### Troubleshooting

**Issue**: "PERPLEXITY_API_KEY is not configured"
- **Solution**: Ensure the API key is set in your `.env` file

**Issue**: Search timeouts
- **Solution**: The function automatically retries. If persistent, check your network connection or Perplexity API status

**Issue**: "Client error - not retrying"
- **Solution**: Check your API key is valid and has sufficient quota

For more information, see the [Perplexity API Documentation](https://docs.perplexity.ai/).
