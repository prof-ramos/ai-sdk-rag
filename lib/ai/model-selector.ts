import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

/**
 * Seleciona o provider correto baseado no nome do modelo
 * Suporta: OpenAI, Anthropic (via OpenRouter), Google Gemini
 */
export function getModel(modelName: string | null) {
  const model = modelName || "openai/gpt-4o";

  // Google Gemini
  if (model.startsWith("google/") || model.startsWith("gemini-")) {
    const geminiModel = model.replace("google/", "").replace("gemini-", "");
    return {
      model: google(geminiModel),
      provider: "google" as const,
    };
  }

  // OpenAI ou OpenRouter (Anthropic, Meta, etc)
  // OpenRouter é compatível com a API OpenAI
  return {
    model: openai(model),
    provider: "openai" as const,
  };
}

/**
 * Cria configuração de provider options baseado no modelo
 */
export function getProviderOptions(
  provider: "google" | "openai",
  settings: {
    thinkingEnabled?: boolean;
    thinkingBudget?: number;
  } = {}
) {
  if (provider === "google") {
    const { thinkingEnabled = false, thinkingBudget = 8192 } = settings;

    if (thinkingEnabled) {
      return {
        google: {
          thinkingConfig: {
            thinkingBudget,
            includeThoughts: true,
          },
        },
      };
    }
  }

  return undefined;
}
