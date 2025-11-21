import { db } from "@/lib/db";
import { chatLogs } from "@/lib/db/schema";
import { findRelevantContent, type RetrievalResult } from "./embedding-optimized";
import { and, gte, desc } from "drizzle-orm";

/**
 * RAG Evaluation Metrics
 * Measures retrieval quality and system performance
 */

export interface RAGMetrics {
  // Retrieval metrics
  averageRetrievalTime: number; // ms
  averageSimilarityScore: number;
  retrievalSuccessRate: number; // % of queries with results above threshold

  // Result quality
  averageResultCount: number;
  medianSimilarity: number;
  minSimilarity: number;
  maxSimilarity: number;

  // Coverage
  totalQueries: number;
  queriesWithNoResults: number;
  queriesWithLowConfidence: number; // < 0.5 similarity
}

/**
 * Evaluate RAG retrieval performance
 */
export async function evaluateRAGPerformance(
  testQueries: string[],
  options?: {
    documentType?: string;
    similarityThreshold?: number;
  }
): Promise<RAGMetrics> {
  const retrievalTimes: number[] = [];
  const similarityScores: number[] = [];
  const resultCounts: number[] = [];
  let queriesWithNoResults = 0;
  let queriesWithLowConfidence = 0;

  for (const query of testQueries) {
    const startTime = Date.now();

    const results = await findRelevantContent(query, {
      documentType: options?.documentType,
      similarityThreshold: options?.similarityThreshold,
    });

    const endTime = Date.now();
    const retrievalTime = endTime - startTime;

    retrievalTimes.push(retrievalTime);
    resultCounts.push(results.length);

    if (results.length === 0) {
      queriesWithNoResults++;
    } else {
      const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
      similarityScores.push(avgSimilarity);

      if (avgSimilarity < 0.5) {
        queriesWithLowConfidence++;
      }
    }
  }

  const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;
  const avgSimilarity = similarityScores.length > 0
    ? similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length
    : 0;
  const avgResultCount = resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length;

  // Calculate median similarity
  const sortedScores = [...similarityScores].sort((a, b) => a - b);
  const medianSimilarity = sortedScores.length > 0
    ? sortedScores[Math.floor(sortedScores.length / 2)]
    : 0;

  return {
    averageRetrievalTime: avgRetrievalTime,
    averageSimilarityScore: avgSimilarity,
    retrievalSuccessRate: ((testQueries.length - queriesWithNoResults) / testQueries.length) * 100,
    averageResultCount: avgResultCount,
    medianSimilarity,
    minSimilarity: Math.min(...similarityScores, 0),
    maxSimilarity: Math.max(...similarityScores, 0),
    totalQueries: testQueries.length,
    queriesWithNoResults,
    queriesWithLowConfidence,
  };
}

/**
 * Analyze retrieval quality from chat logs
 * Uses actual user queries to evaluate system performance
 */
export async function analyzeRetrievalFromLogs(
  sampleSize: number = 100,
  dateFrom?: Date
): Promise<{
  totalAnalyzed: number;
  averageContextQuality: number;
  commonIssues: Array<{
    issue: string;
    count: number;
    percentage: number;
  }>;
}> {
  const filters = dateFrom ? [gte(chatLogs.createdAt, dateFrom)] : [];

  const logs = await db
    .select({
      question: chatLogs.question,
      answer: chatLogs.answer,
      context: chatLogs.context,
    })
    .from(chatLogs)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(chatLogs.createdAt))
    .limit(sampleSize);

  let totalQuality = 0;
  const issues = {
    noResults: 0,
    lowSimilarity: 0,
    genericAnswer: 0, // "Sorry, I don't know"
    longRetrievalTime: 0,
  };

  for (const log of logs) {
    // Check if answer is generic (no information found)
    if (log.answer.toLowerCase().includes("sorry") ||
        log.answer.toLowerCase().includes("don't know") ||
        log.answer.toLowerCase().includes("não sei")) {
      issues.genericAnswer++;
      continue;
    }

    // Analyze context if available
    const context = log.context as any;
    if (context?.retrievalMetrics) {
      const metrics = context.retrievalMetrics;

      if (metrics.resultCount === 0) {
        issues.noResults++;
      }

      if (metrics.avgSimilarity && metrics.avgSimilarity < 0.4) {
        issues.lowSimilarity++;
      }

      if (metrics.retrievalTime && metrics.retrievalTime > 1000) {
        issues.longRetrievalTime++;
      }

      // Quality score (0-1)
      const quality = Math.min(metrics.avgSimilarity || 0, 1);
      totalQuality += quality;
    }
  }

  const averageContextQuality = logs.length > 0 ? totalQuality / logs.length : 0;

  const commonIssues = [
    { issue: "Generic answer (no results)", count: issues.genericAnswer, percentage: (issues.genericAnswer / logs.length) * 100 },
    { issue: "No results returned", count: issues.noResults, percentage: (issues.noResults / logs.length) * 100 },
    { issue: "Low similarity scores", count: issues.lowSimilarity, percentage: (issues.lowSimilarity / logs.length) * 100 },
    { issue: "Slow retrieval (>1s)", count: issues.longRetrievalTime, percentage: (issues.longRetrievalTime / logs.length) * 100 },
  ].sort((a, b) => b.count - a.count);

  return {
    totalAnalyzed: logs.length,
    averageContextQuality,
    commonIssues,
  };
}

/**
 * Test query set for evaluation
 * These should represent common user queries
 */
export const TEST_QUERIES = {
  legal: [
    "O que diz o artigo 5º da Constituição?",
    "Quais são as competências do Ministério das Relações Exteriores?",
    "Como funciona o processo de licitação pública?",
    "Quais são as regras para contratos governamentais?",
  ],
  transparency: [
    "Quanto o governo gastou em 2024?",
    "Quais foram os maiores contratos do ano passado?",
    "Quantos servidores públicos trabalham no MRE?",
  ],
  general: [
    "Qual é a política externa do Brasil?",
    "Como solicitar uma certidão negativa?",
    "Quais são os direitos do cidadão?",
  ],
};

/**
 * Run comprehensive RAG evaluation
 */
export async function runComprehensiveEvaluation(): Promise<{
  legal: RAGMetrics;
  transparency: RAGMetrics;
  general: RAGMetrics;
  overall: RAGMetrics;
  logAnalysis: Awaited<ReturnType<typeof analyzeRetrievalFromLogs>>;
}> {
  const [legal, transparency, general, logAnalysis] = await Promise.all([
    evaluateRAGPerformance(TEST_QUERIES.legal),
    evaluateRAGPerformance(TEST_QUERIES.transparency),
    evaluateRAGPerformance(TEST_QUERIES.general),
    analyzeRetrievalFromLogs(100),
  ]);

  // Calculate overall metrics
  const allQueries = [
    ...TEST_QUERIES.legal,
    ...TEST_QUERIES.transparency,
    ...TEST_QUERIES.general,
  ];
  const overall = await evaluateRAGPerformance(allQueries);

  return {
    legal,
    transparency,
    general,
    overall,
    logAnalysis,
  };
}

/**
 * Diversity metrics - Ensures results aren't too similar to each other
 */
export function calculateDiversity(results: RetrievalResult[]): number {
  if (results.length < 2) return 1.0;

  // Simple diversity: check if results come from different sources
  const uniqueSources = new Set(
    results.map(r => r.metadata?.resourceId || "unknown")
  );

  return uniqueSources.size / results.length;
}

/**
 * Check for query-result relevance using simple heuristics
 */
export function checkRelevance(
  query: string,
  result: RetrievalResult
): {
  hasQueryTerms: boolean;
  termCoverage: number;
  score: number;
} {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  const resultText = result.content.toLowerCase();

  let matchedTerms = 0;
  for (const term of queryTerms) {
    if (resultText.includes(term)) {
      matchedTerms++;
    }
  }

  const termCoverage = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0;

  return {
    hasQueryTerms: matchedTerms > 0,
    termCoverage,
    score: (result.similarity * 0.7) + (termCoverage * 0.3), // Combined score
  };
}

/**
 * Generate evaluation report
 */
export async function generateEvaluationReport(): Promise<string> {
  const evaluation = await runComprehensiveEvaluation();

  const report = `
# RAG System Evaluation Report
Generated: ${new Date().toISOString()}

## Overall Performance
- **Total Queries Tested:** ${evaluation.overall.totalQueries}
- **Avg Retrieval Time:** ${evaluation.overall.averageRetrievalTime.toFixed(2)}ms
- **Avg Similarity Score:** ${evaluation.overall.averageSimilarityScore.toFixed(3)}
- **Success Rate:** ${evaluation.overall.retrievalSuccessRate.toFixed(1)}%
- **Avg Results per Query:** ${evaluation.overall.averageResultCount.toFixed(1)}

## Performance by Category

### Legal Queries
- Retrieval Time: ${evaluation.legal.averageRetrievalTime.toFixed(2)}ms
- Similarity: ${evaluation.legal.averageSimilarityScore.toFixed(3)}
- Success Rate: ${evaluation.legal.retrievalSuccessRate.toFixed(1)}%

### Transparency Queries
- Retrieval Time: ${evaluation.transparency.averageRetrievalTime.toFixed(2)}ms
- Similarity: ${evaluation.transparency.averageSimilarityScore.toFixed(3)}
- Success Rate: ${evaluation.transparency.retrievalSuccessRate.toFixed(1)}%

### General Queries
- Retrieval Time: ${evaluation.general.averageRetrievalTime.toFixed(2)}ms
- Similarity: ${evaluation.general.averageSimilarityScore.toFixed(3)}
- Success Rate: ${evaluation.general.retrievalSuccessRate.toFixed(1)}%

## Log Analysis (Last 100 Queries)
- **Analyzed:** ${evaluation.logAnalysis.totalAnalyzed} queries
- **Avg Context Quality:** ${evaluation.logAnalysis.averageContextQuality.toFixed(3)}

### Common Issues:
${evaluation.logAnalysis.commonIssues.map(issue =>
  `- ${issue.issue}: ${issue.count} (${issue.percentage.toFixed(1)}%)`
).join('\n')}

## Recommendations
${generateRecommendations(evaluation)}
`;

  return report;
}

/**
 * Generate recommendations based on evaluation results
 */
function generateRecommendations(evaluation: any): string {
  const recommendations: string[] = [];

  // Check retrieval time
  if (evaluation.overall.averageRetrievalTime > 500) {
    recommendations.push("⚠️ **Retrieval time is high (>500ms).** Consider adding more indexes or using caching.");
  }

  // Check similarity scores
  if (evaluation.overall.averageSimilarityScore < 0.4) {
    recommendations.push("⚠️ **Low similarity scores.** Consider improving chunking strategy or using better embeddings.");
  }

  // Check success rate
  if (evaluation.overall.retrievalSuccessRate < 80) {
    recommendations.push("⚠️ **Low success rate (<80%).** Add more content to knowledge base or lower similarity threshold.");
  }

  // Check for generic answers
  const genericAnswerRate = evaluation.logAnalysis.commonIssues.find(
    (i: any) => i.issue.includes("Generic answer")
  )?.percentage || 0;

  if (genericAnswerRate > 20) {
    recommendations.push("⚠️ **High rate of generic answers (>20%).** Improve retrieval relevance or add fallback strategies.");
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ **All metrics look good!** Continue monitoring performance.");
  }

  return recommendations.join('\n');
}
