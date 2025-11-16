import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { getSetting } from "@/lib/actions/settings";
import { createChatLog } from "@/lib/actions/chat-logs";
import { getModel, getProviderOptions } from "@/lib/ai/model-selector";
import {
  convertToModelMessages,
  generateObject,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";
import { headers } from "next/headers";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get configuration from settings
  const systemPrompt = await getSetting("system_prompt");
  const modelName = await getSetting("model_name");
  const thinkingEnabled = (await getSetting("thinking_enabled")) === "true";
  const thinkingBudget = parseInt(await getSetting("thinking_budget") || "8192");

  // Get user IP for logging
  const headersList = await headers();
  const userIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";

  // Select model and provider
  const { model, provider } = getModel(modelName);
  const providerOptions = getProviderOptions(provider, {
    thinkingEnabled,
    thinkingBudget,
  });

  const defaultSystemPrompt = `You are a helpful assistant acting as the users' second brain.
    Use tools on every request.
    Be sure to getInformation from your knowledge base before answering any questions.
    If the user presents infromation about themselves, use the addResource tool to store it.
    If a response requires multiple tools, call one tool after another without responding to the user.
    If a response requires information from an additional tool to generate a response, call the appropriate tools in order before responding to the user.
    ONLY respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."
    Be sure to adhere to any instructions in tool calls ie. if they say to responsd like "...", do exactly that.
    If the relevant information is not a direct match to the users prompt, you can be creative in deducing the answer.
    Keep responses short and concise. Answer in a single sentence where possible.
    If you are unsure, use the getInformation tool and you can use common sense to reason based on the information you do have.
    Use your abilities as a reasoning machine to answer questions based on the information you do have.
`;

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    system: systemPrompt || defaultSystemPrompt,
    providerOptions,
    stopWhen: stepCountIs(5),
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe("the content or resource to add to the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
          similarQuestions: z.array(z.string()).describe("keywords to search"),
        }),
        execute: async ({ similarQuestions }) => {
          const results = await Promise.all(
            similarQuestions.map(
              async (question) => await findRelevantContent(question),
            ),
          );
          // Flatten the array of arrays and remove duplicates based on 'name'
          const uniqueResults = Array.from(
            new Map(results.flat().map((item) => [item?.name, item])).values(),
          );
          return uniqueResults;
        },
      }),
      understandQuery: tool({
        description: `understand the users query. use this tool on every prompt.`,
        inputSchema: z.object({
          query: z.string().describe("the users query"),
          toolsToCallInOrder: z
            .array(z.string())
            .describe(
              "these are the tools you need to call in the order necessary to respond to the users query",
            ),
        }),
        execute: async ({ query }) => {
          const { object } = await generateObject({
            model: "openai/gpt-4o",
            system:
              "You are a query understanding assistant. Analyze the user query and generate similar questions.",
            schema: z.object({
              questions: z
                .array(z.string())
                .max(3)
                .describe("similar questions to the user's query. be concise."),
            }),
            prompt: `Analyze this query: "${query}". Provide the following:
                    3 similar questions that could help answer the user's query`,
          });
          return object.questions;
        },
      }),
    },
    onFinish: async ({ text, usage, reasoning }) => {
      // Log the conversation
      const lastUserMessage = messages.filter(m => m.role === "user").pop();

      if (lastUserMessage) {
        try {
          await createChatLog({
            userId: userIp,
            question: typeof lastUserMessage.content === "string"
              ? lastUserMessage.content
              : JSON.stringify(lastUserMessage.content),
            answer: text,
            model: modelName || "openai/gpt-4o",
            context: {
              usage,
              reasoning: reasoning || undefined, // Include Gemini thinking if available
              provider,
            },
          });
        } catch (error) {
          console.error("Error logging chat:", error);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
