import { db } from "@/lib/db";
import { chatLogs } from "@/lib/db/schema";
import { sql, and, gte, lte, eq } from "drizzle-orm";

/**
 * Token and cost tracking for LLM and embedding usage
 */

// Pricing per 1M tokens (as of 2025)
export const PRICING = {
  // OpenAI GPT-4 models
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },

  // Anthropic Claude models
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },

  // Google Gemini models
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },

  // Embeddings
  "text-embedding-ada-002": { input: 0.1, output: 0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
};

/**
 * Extract model name from full model string
 * e.g., "openai/gpt-4o" -> "gpt-4o"
 */
function extractModelName(fullModel: string): string {
  if (fullModel.includes("/")) {
    return fullModel.split("/")[1];
  }
  return fullModel;
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): number {
  const model = extractModelName(modelName);
  const pricing = PRICING[model as keyof typeof PRICING];

  if (!pricing) {
    console.warn(`Unknown model for pricing: ${model}`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Get token usage statistics for a user
 */
export interface TokenStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  avgTokensPerRequest: number;
  modelBreakdown: Array<{
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

export async function getUserTokenStats(
  userId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<TokenStats> {
  const filters = [eq(chatLogs.userId, userId)];

  if (dateFrom) {
    filters.push(gte(chatLogs.createdAt, dateFrom));
  }

  if (dateTo) {
    filters.push(lte(chatLogs.createdAt, dateTo));
  }

  const logs = await db
    .select({
      model: chatLogs.model,
      context: chatLogs.context,
    })
    .from(chatLogs)
    .where(and(...filters));

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  const modelStats = new Map<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>();

  for (const log of logs) {
    const context = log.context as any;
    const usage = context?.usage;
    const model = log.model || "unknown";

    if (!usage) continue;

    const inputTokens = usage.promptTokens || 0;
    const outputTokens = usage.completionTokens || 0;
    const cost = calculateCost(inputTokens, outputTokens, model);

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCost += cost;

    // Update model breakdown
    const existing = modelStats.get(model) || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };

    modelStats.set(model, {
      requests: existing.requests + 1,
      inputTokens: existing.inputTokens + inputTokens,
      outputTokens: existing.outputTokens + outputTokens,
      cost: existing.cost + cost,
    });
  }

  const totalTokens = totalInputTokens + totalOutputTokens;

  return {
    totalRequests: logs.length,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    estimatedCost: totalCost,
    avgTokensPerRequest: logs.length > 0 ? totalTokens / logs.length : 0,
    modelBreakdown: Array.from(modelStats.entries()).map(([model, stats]) => ({
      model,
      ...stats,
    })),
  };
}

/**
 * Get system-wide token usage statistics
 */
export async function getSystemTokenStats(
  dateFrom?: Date,
  dateTo?: Date
): Promise<TokenStats & { uniqueUsers: number }> {
  const filters = [];

  if (dateFrom) {
    filters.push(gte(chatLogs.createdAt, dateFrom));
  }

  if (dateTo) {
    filters.push(lte(chatLogs.createdAt, dateTo));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const logs = await db
    .select({
      userId: chatLogs.userId,
      model: chatLogs.model,
      context: chatLogs.context,
    })
    .from(chatLogs)
    .where(whereClause);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  const uniqueUsers = new Set<string>();
  const modelStats = new Map<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>();

  for (const log of logs) {
    if (log.userId) {
      uniqueUsers.add(log.userId);
    }

    const context = log.context as any;
    const usage = context?.usage;
    const model = log.model || "unknown";

    if (!usage) continue;

    const inputTokens = usage.promptTokens || 0;
    const outputTokens = usage.completionTokens || 0;
    const cost = calculateCost(inputTokens, outputTokens, model);

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCost += cost;

    const existing = modelStats.get(model) || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };

    modelStats.set(model, {
      requests: existing.requests + 1,
      inputTokens: existing.inputTokens + inputTokens,
      outputTokens: existing.outputTokens + outputTokens,
      cost: existing.cost + cost,
    });
  }

  const totalTokens = totalInputTokens + totalOutputTokens;

  return {
    totalRequests: logs.length,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    estimatedCost: totalCost,
    avgTokensPerRequest: logs.length > 0 ? totalTokens / logs.length : 0,
    uniqueUsers: uniqueUsers.size,
    modelBreakdown: Array.from(modelStats.entries()).map(([model, stats]) => ({
      model,
      ...stats,
    })),
  };
}

/**
 * Get top users by token usage
 */
export async function getTopUsersByTokens(
  limit: number = 10,
  dateFrom?: Date,
  dateTo?: Date
): Promise<Array<{
  userId: string;
  totalTokens: number;
  estimatedCost: number;
  requests: number;
}>> {
  const filters = [];

  if (dateFrom) {
    filters.push(gte(chatLogs.createdAt, dateFrom));
  }

  if (dateTo) {
    filters.push(lte(chatLogs.createdAt, dateTo));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const logs = await db
    .select({
      userId: chatLogs.userId,
      model: chatLogs.model,
      context: chatLogs.context,
    })
    .from(chatLogs)
    .where(whereClause);

  const userStats = new Map<string, {
    totalTokens: number;
    estimatedCost: number;
    requests: number;
  }>();

  for (const log of logs) {
    const userId = log.userId || "anonymous";
    const context = log.context as any;
    const usage = context?.usage;
    const model = log.model || "unknown";

    if (!usage) continue;

    const inputTokens = usage.promptTokens || 0;
    const outputTokens = usage.completionTokens || 0;
    const tokens = inputTokens + outputTokens;
    const cost = calculateCost(inputTokens, outputTokens, model);

    const existing = userStats.get(userId) || {
      totalTokens: 0,
      estimatedCost: 0,
      requests: 0,
    };

    userStats.set(userId, {
      totalTokens: existing.totalTokens + tokens,
      estimatedCost: existing.estimatedCost + cost,
      requests: existing.requests + 1,
    });
  }

  return Array.from(userStats.entries())
    .map(([userId, stats]) => ({
      userId,
      ...stats,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, limit);
}

/**
 * Check if user exceeds budget threshold
 */
export async function checkUserBudget(
  userId: string,
  budgetLimit: number,
  period: "day" | "week" | "month" = "month"
): Promise<{
  exceeded: boolean;
  currentCost: number;
  budgetLimit: number;
  percentUsed: number;
}> {
  const now = new Date();
  let dateFrom: Date;

  switch (period) {
    case "day":
      dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "week":
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const stats = await getUserTokenStats(userId, dateFrom);
  const percentUsed = (stats.estimatedCost / budgetLimit) * 100;

  return {
    exceeded: stats.estimatedCost >= budgetLimit,
    currentCost: stats.estimatedCost,
    budgetLimit,
    percentUsed,
  };
}

/**
 * Estimate embedding cost for a document
 */
export function estimateEmbeddingCost(
  textLength: number,
  model: keyof typeof PRICING = "text-embedding-ada-002"
): {
  estimatedTokens: number;
  estimatedCost: number;
} {
  // Rough estimate: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(textLength / 4);
  const pricing = PRICING[model];

  return {
    estimatedTokens,
    estimatedCost: (estimatedTokens / 1_000_000) * pricing.input,
  };
}

/**
 * Get cost breakdown by day for visualization
 */
export async function getDailyCostBreakdown(
  days: number = 30
): Promise<Array<{
  date: string;
  cost: number;
  requests: number;
  tokens: number;
}>> {
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const logs = await db
    .select({
      createdAt: chatLogs.createdAt,
      model: chatLogs.model,
      context: chatLogs.context,
    })
    .from(chatLogs)
    .where(gte(chatLogs.createdAt, dateFrom))
    .orderBy(chatLogs.createdAt);

  const dailyStats = new Map<string, {
    cost: number;
    requests: number;
    tokens: number;
  }>();

  for (const log of logs) {
    const date = log.createdAt.toISOString().split('T')[0];
    const context = log.context as any;
    const usage = context?.usage;
    const model = log.model || "unknown";

    if (!usage) continue;

    const inputTokens = usage.promptTokens || 0;
    const outputTokens = usage.completionTokens || 0;
    const tokens = inputTokens + outputTokens;
    const cost = calculateCost(inputTokens, outputTokens, model);

    const existing = dailyStats.get(date) || {
      cost: 0,
      requests: 0,
      tokens: 0,
    };

    dailyStats.set(date, {
      cost: existing.cost + cost,
      requests: existing.requests + 1,
      tokens: existing.tokens + tokens,
    });
  }

  return Array.from(dailyStats.entries())
    .map(([date, stats]) => ({
      date,
      ...stats,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
