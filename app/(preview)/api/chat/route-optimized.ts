import { createResource } from "@/lib/actions/resources-optimized";
import {
  findRelevantContent,
  extractKeywords,
  RAG_CONFIG,
} from "@/lib/ai/embedding-optimized";
import { getSetting } from "@/lib/actions/settings";
import { createChatLog } from "@/lib/actions/chat-logs";
import { getModel, getProviderOptions } from "@/lib/ai/model-selector";
import {
  buscarOrgaosSIAFI,
  buscarDespesasPorOrgao,
  buscarContratos,
  buscarViagens,
  buscarLicitacoes,
  buscarServidoresPorOrgao,
} from "@/lib/api/portal-transparencia";
import {
  convertToModelMessages,
  generateObject,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";
import { searchWeb } from "@/lib/ai/web-search";
import { headers } from "next/headers";
import { checkRelevance, calculateDiversity } from "@/lib/ai/rag-evaluation";

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
    If the user asks about current events, recent information, or things not in your knowledge base, use the searchWeb tool.
    If the user presents information about themselves, use the addResource tool to store it.
    If a response requires multiple tools, call one tool after another without responding to the user.
    If a response requires information from an additional tool to generate a response, call the appropriate tools in order before responding to the user.
    ONLY respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."
    Be sure to adhere to any instructions in tool calls ie. if they say to respond like "...", do exactly that.
    If the relevant information is not a direct match to the users prompt, you can be creative in deducing the answer.
    Keep responses short and concise. Answer in a single sentence where possible.
    If you are unsure, use the getInformation tool and you can use common sense to reason based on the information you do have.
    Use your abilities as a reasoning machine to answer questions based on the information you do have.
`;

  // Track retrieval metrics
  let retrievalMetrics: any = {};

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
          title: z
            .string()
            .optional()
            .describe("optional title for the resource"),
          documentType: z
            .string()
            .optional()
            .describe("type of document (lei, decreto, portaria, etc)"),
        }),
        execute: async ({ content, title, documentType }) =>
          createResource({ content, title, documentType }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.
          Use this tool FIRST before answering any question about laws, regulations, or stored information.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
          similarQuestions: z.array(z.string()).describe("keywords to search"),
          documentType: z
            .string()
            .optional()
            .describe("filter by document type if known (lei, decreto, etc)"),
        }),
        execute: async ({ question, similarQuestions, documentType }) => {
          const startTime = Date.now();

          // Extract keywords for hybrid search
          const keywords = extractKeywords(question);

          // Execute searches in parallel
          const results = await Promise.all(
            similarQuestions.map(async (q) =>
              findRelevantContent(q, {
                documentType,
                useKeywordBoost: true,
                keywords,
                topK: RAG_CONFIG.TOP_K_RESULTS,
                finalResults: RAG_CONFIG.FINAL_RESULTS,
              })
            )
          );

          // Flatten and deduplicate
          const uniqueResults = Array.from(
            new Map(
              results
                .flat()
                .map((item) => [item.content, item])
            ).values()
          );

          const endTime = Date.now();

          // Calculate metrics
          const avgSimilarity = uniqueResults.length > 0
            ? uniqueResults.reduce((sum, r) => sum + r.similarity, 0) / uniqueResults.length
            : 0;

          const diversity = calculateDiversity(uniqueResults);

          // Store metrics for logging
          retrievalMetrics = {
            retrievalTime: endTime - startTime,
            resultCount: uniqueResults.length,
            avgSimilarity,
            diversity,
            keywords,
            documentType: documentType || null,
          };

          // Add relevance scores
          const enhancedResults = uniqueResults.map(result => {
            const relevance = checkRelevance(question, result);
            return {
              ...result,
              relevanceScore: relevance.score,
              termCoverage: relevance.termCoverage,
            };
          });

          // Sort by relevance score
          enhancedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

          console.log(`📊 Retrieval metrics:`, {
            time: `${retrievalMetrics.retrievalTime}ms`,
            results: retrievalMetrics.resultCount,
            avgSimilarity: avgSimilarity.toFixed(3),
            diversity: diversity.toFixed(2),
          });

          return {
            results: enhancedResults.slice(0, RAG_CONFIG.FINAL_RESULTS),
            metadata: {
              totalResults: enhancedResults.length,
              avgSimilarity,
              diversity,
              retrievalTime: retrievalMetrics.retrievalTime,
            },
          };
        },
      }),
      understandQuery: tool({
        description: `understand the users query. use this tool on every prompt.`,
        inputSchema: z.object({
          query: z.string().describe("the users query"),
          toolsToCallInOrder: z
            .array(z.string())
            .describe(
              "these are the tools you need to call in the order necessary to respond to the users query"
            ),
        }),
        execute: async ({ query }) => {
          const { object } = await generateObject({
            model,
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
      searchWeb: tool({
        description: `search the web for current information, recent events, or facts not in your knowledge base.
          Use this when the user asks about current events, news, or recent information.`,
        inputSchema: z.object({
          query: z
            .string()
            .describe("the search query to find information on the web"),
          maxResults: z
            .number()
            .optional()
            .describe("maximum number of results to return (default: 5)"),
        }),
        execute: async ({ query, maxResults }) => {
          const results = await searchWeb(query, maxResults);
          return {
            query,
            results,
            summary: `Found ${results.length} results for: ${query}`,
          };
        },
      }),
      consultarTransparencia: tool({
        description: `Consulta dados do Portal da Transparência do Governo Federal.
          Use SOMENTE quando o usuário perguntar EXPLICITAMENTE sobre:
          - Gastos/despesas/orçamento de órgãos federais
          - Contratos governamentais
          - Viagens a serviço de órgãos públicos
          - Licitações públicas
          - Quantidade de servidores públicos federais
          NÃO use para perguntas sobre legislação, atribuições ou conceitos.
          Use apenas quando tiver CERTEZA que a resposta virá dessa consulta.`,
        inputSchema: z.object({
          tipo: z
            .enum([
              "despesas",
              "contratos",
              "viagens",
              "licitacoes",
              "servidores",
              "orgaos",
            ])
            .describe("Tipo de consulta a realizar"),
          ano: z
            .number()
            .optional()
            .describe("Ano de referência (para despesas)"),
          dataInicial: z
            .string()
            .optional()
            .describe("Data inicial no formato dd/MM/yyyy"),
          dataFinal: z
            .string()
            .optional()
            .describe("Data final no formato dd/MM/yyyy"),
          codigoOrgao: z
            .string()
            .optional()
            .describe(
              "Código SIAFI do órgão (ex: 35000 para MRE). Se não souber, busque primeiro com tipo 'orgaos'"
            ),
          nomeOrgao: z
            .string()
            .optional()
            .describe("Nome do órgão para buscar código (ex: 'Relações Exteriores')"),
        }),
        execute: async ({
          tipo,
          ano,
          dataInicial,
          dataFinal,
          codigoOrgao,
          nomeOrgao,
        }) => {
          try {
            if (!process.env.PORTAL_TRANSPARENCIA_API_KEY) {
              return {
                error:
                  "API do Portal da Transparência não configurada. Entre em contato com o administrador.",
              };
            }

            switch (tipo) {
              case "orgaos":
                return await buscarOrgaosSIAFI(
                  nomeOrgao ? { nome: nomeOrgao } : {}
                );

              case "despesas":
                if (!ano) {
                  return { error: "Ano é obrigatório para consulta de despesas" };
                }
                return await buscarDespesasPorOrgao(ano, codigoOrgao);

              case "contratos":
                if (!dataInicial || !dataFinal || !codigoOrgao) {
                  return {
                    error:
                      "Data inicial, data final e código do órgão são obrigatórios",
                  };
                }
                return await buscarContratos(
                  dataInicial,
                  dataFinal,
                  codigoOrgao
                );

              case "viagens":
                if (!dataInicial || !dataFinal) {
                  return { error: "Datas inicial e final são obrigatórias" };
                }
                return await buscarViagens(dataInicial, dataFinal, codigoOrgao);

              case "licitacoes":
                if (!dataInicial || !dataFinal || !codigoOrgao) {
                  return {
                    error:
                      "Data inicial, data final e código do órgão são obrigatórios",
                  };
                }
                return await buscarLicitacoes(
                  dataInicial,
                  dataFinal,
                  codigoOrgao
                );

              case "servidores":
                if (!codigoOrgao) {
                  return { error: "Código do órgão é obrigatório" };
                }
                return await buscarServidoresPorOrgao(codigoOrgao);

              default:
                return { error: "Tipo de consulta não reconhecido" };
            }
          } catch (error) {
            console.error("Erro ao consultar Portal da Transparência:", error);
            return {
              error:
                "Erro ao consultar Portal da Transparência. Verifique os parâmetros e tente novamente.",
            };
          }
        },
      }),
    },
    onFinish: async ({ text, usage, reasoning }) => {
      const lastUserMessage = messages.filter((m) => m.role === "user").pop();

      if (lastUserMessage) {
        try {
          const questionText = lastUserMessage.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join(" ");

          await createChatLog({
            userId: userIp,
            question: questionText || JSON.stringify(lastUserMessage.parts),
            answer: text,
            model: modelName || "openai/gpt-4o",
            context: JSON.parse(
              JSON.stringify({
                usage,
                reasoning: reasoning || null,
                provider,
                retrievalMetrics, // Include RAG metrics
              })
            ),
          });
        } catch (error) {
          console.error("Error logging chat:", error);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
