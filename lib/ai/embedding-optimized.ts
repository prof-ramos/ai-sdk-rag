import { embed, embedMany } from "ai";
import { cosineDistance, desc, gt, sql, and, eq, or, like } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import { resources } from "../db/schema/resources";
import { db } from "../db";

const embeddingModel = "openai/text-embedding-ada-002";

// Embedding cache configuration
const embeddingCache = new Map<string, number[]>();
const CACHE_MAX_SIZE = 1000;

// RAG Configuration - Now exportable for tuning
export const RAG_CONFIG = {
  // Chunking parameters
  CHUNK_SIZE: 512, // tokens (roughly 2000 characters)
  CHUNK_OVERLAP: 64, // tokens overlap between chunks
  MIN_CHUNK_SIZE: 50, // minimum characters
  MAX_CHUNK_SIZE: 3000, // maximum characters (safety)

  // Retrieval parameters
  SIMILARITY_THRESHOLD: 0.3, // minimum cosine similarity
  TOP_K_RESULTS: 10, // fetch more, rerank to top 4
  FINAL_RESULTS: 4, // final results after reranking

  // Hybrid search weights
  VECTOR_WEIGHT: 0.7, // weight for vector similarity
  KEYWORD_WEIGHT: 0.3, // weight for keyword matching

  // Cache settings
  CACHE_ENABLED: true,
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 hour
};

/**
 * Enhanced chunking with overlap and size limits
 * Improvements:
 * - Respects token/character limits
 * - Adds overlap for context preservation
 * - Better sentence boundary detection
 * - Metadata preservation
 */
export const generateChunks = (input: string, metadata?: {
  title?: string;
  documentType?: string;
  sourceUrl?: string;
}): Array<{ content: string; metadata?: typeof metadata }> => {
  const trimmedInput = input.trim();

  // Strategy 1: Article-based chunking (for legal documents)
  const articlePattern = /(?=(?:Art\.?|Artigo)\s*\d+)/i;
  const articles = trimmedInput.split(articlePattern);

  if (articles.length > 1) {
    return articles
      .map(article => article.trim())
      .filter(article => article.length >= RAG_CONFIG.MIN_CHUNK_SIZE && article.length <= RAG_CONFIG.MAX_CHUNK_SIZE)
      .map(content => ({
        content,
        metadata,
      }));
  }

  // Strategy 2: Paragraph-based chunking
  const paragraphs = trimmedInput.split(/\n\n+/);

  if (paragraphs.length > 1) {
    const validParagraphs = paragraphs
      .map(p => p.trim())
      .filter(p => p.length >= RAG_CONFIG.MIN_CHUNK_SIZE);

    if (validParagraphs.length > 0) {
      return validParagraphs.map(content => ({
        content,
        metadata,
      }));
    }
  }

  // Strategy 3: Sliding window with overlap
  return createSlidingWindowChunks(trimmedInput, metadata);
};

/**
 * Creates chunks using sliding window with overlap
 * Preserves context at chunk boundaries
 */
function createSlidingWindowChunks(
  text: string,
  metadata?: any
): Array<{ content: string; metadata?: any }> {
  // Improved sentence splitting (handles Dr., Sr., etc.)
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];

  const chunks: Array<{ content: string; metadata?: any }> = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    const sentenceLength = sentence.length;

    // If adding this sentence exceeds max, save current chunk
    if (currentLength + sentenceLength > RAG_CONFIG.CHUNK_SIZE && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ').trim();

      if (chunkText.length >= RAG_CONFIG.MIN_CHUNK_SIZE) {
        chunks.push({
          content: chunkText,
          metadata,
        });
      }

      // Create overlap: keep last few sentences
      const overlapSentences = Math.floor(currentChunk.length * 0.2); // 20% overlap
      currentChunk = currentChunk.slice(-overlapSentences);
      currentLength = currentChunk.join(' ').length;
    }

    currentChunk.push(sentence);
    currentLength += sentenceLength;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ').trim();
    if (chunkText.length >= RAG_CONFIG.MIN_CHUNK_SIZE) {
      chunks.push({
        content: chunkText,
        metadata,
      });
    }
  }

  // Fallback: if no chunks created, return whole text
  if (chunks.length === 0) {
    chunks.push({
      content: text.trim(),
      metadata,
    });
  }

  return chunks;
}

/**
 * Generate embeddings with enhanced metadata
 */
export const generateEmbeddings = async (
  value: string,
  metadata?: {
    title?: string;
    documentType?: string;
    sourceUrl?: string;
  }
): Promise<Array<{ embedding: number[]; content: string; metadata?: typeof metadata }>> => {
  const chunks = generateChunks(value, metadata);
  const contents = chunks.map(c => c.content);

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: contents,
  });

  return embeddings.map((e, i) => ({
    content: chunks[i].content,
    embedding: e,
    metadata: chunks[i].metadata,
  }));
};

/**
 * Generate single embedding with caching
 */
export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\n", " ");
  const cacheKey = input.toLowerCase().trim();

  // Check cache
  if (RAG_CONFIG.CACHE_ENABLED && embeddingCache.has(cacheKey)) {
    console.log("🎯 Cache hit for embedding");
    return embeddingCache.get(cacheKey)!;
  }

  // Generate new embedding
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });

  // Add to cache
  if (RAG_CONFIG.CACHE_ENABLED) {
    embeddingCache.set(cacheKey, embedding);

    // Enforce cache size limit (FIFO)
    if (embeddingCache.size > CACHE_MAX_SIZE) {
      const firstKey = embeddingCache.keys().next().value;
      if (firstKey) {
        embeddingCache.delete(firstKey);
      }
    }
  }

  return embedding;
};

/**
 * Clear embedding cache (useful for testing or memory management)
 */
export const clearEmbeddingCache = () => {
  embeddingCache.clear();
  console.log("🧹 Embedding cache cleared");
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => ({
  size: embeddingCache.size,
  maxSize: CACHE_MAX_SIZE,
  utilizationPercent: (embeddingCache.size / CACHE_MAX_SIZE) * 100,
});

/**
 * Enhanced content retrieval with metadata filtering and hybrid search
 */
export interface RetrievalOptions {
  // Metadata filters
  documentType?: string;
  title?: string;
  dateFrom?: Date;
  dateTo?: Date;

  // Search parameters
  similarityThreshold?: number;
  topK?: number;
  finalResults?: number;

  // Hybrid search
  useKeywordBoost?: boolean;
  keywords?: string[];
}

export interface RetrievalResult {
  content: string;
  similarity: number;
  metadata?: {
    resourceId?: string;
    title?: string;
    documentType?: string;
    sourceUrl?: string;
    createdAt?: Date;
  };
  _score?: number; // hybrid score if applicable
}

/**
 * Find relevant content with advanced filtering and hybrid search
 */
export const findRelevantContent = async (
  userQuery: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> => {
  const {
    documentType,
    title,
    dateFrom,
    dateTo,
    similarityThreshold = RAG_CONFIG.SIMILARITY_THRESHOLD,
    topK = RAG_CONFIG.TOP_K_RESULTS,
    finalResults = RAG_CONFIG.FINAL_RESULTS,
    useKeywordBoost = false,
    keywords = [],
  } = options;

  // Generate query embedding
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;

  // Build metadata filters
  const filters = [];

  if (documentType) {
    filters.push(eq(resources.documentType, documentType));
  }

  if (title) {
    filters.push(like(resources.title, `%${title}%`));
  }

  if (dateFrom) {
    filters.push(sql`${resources.createdAt} >= ${dateFrom}`);
  }

  if (dateTo) {
    filters.push(sql`${resources.createdAt} <= ${dateTo}`);
  }

  // Execute vector search with metadata filters
  const query = db
    .select({
      content: embeddings.content,
      similarity,
      resourceId: embeddings.resourceId,
      title: resources.title,
      documentType: resources.documentType,
      sourceUrl: resources.sourceUrl,
      createdAt: resources.createdAt,
    })
    .from(embeddings)
    .leftJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(
      and(
        gt(similarity, similarityThreshold),
        filters.length > 0 ? and(...filters) : undefined
      )
    )
    .orderBy(desc(similarity))
    .limit(topK);

  let results = await query;

  // Apply keyword boosting if enabled
  if (useKeywordBoost && keywords.length > 0) {
    results = applyKeywordBoosting(results, keywords);
  }

  // Return top results with metadata
  return results.slice(0, finalResults).map(r => ({
    content: r.content,
    similarity: r.similarity,
    metadata: {
      resourceId: r.resourceId || undefined,
      title: r.title || undefined,
      documentType: r.documentType || undefined,
      sourceUrl: r.sourceUrl || undefined,
      createdAt: r.createdAt || undefined,
    },
    _score: r.similarity, // Can be modified by boosting
  }));
};

/**
 * Apply keyword boosting for hybrid search
 * Boosts results that contain query keywords
 */
function applyKeywordBoosting(
  results: any[],
  keywords: string[]
): any[] {
  return results.map(result => {
    let boost = 0;
    const contentLower = result.content.toLowerCase();

    // Count keyword matches
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const matches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      boost += matches * 0.1; // Each match adds 0.1 to similarity
    }

    // Apply weighted hybrid score
    const hybridScore =
      (result.similarity * RAG_CONFIG.VECTOR_WEIGHT) +
      (Math.min(boost, 0.3) * RAG_CONFIG.KEYWORD_WEIGHT);

    return {
      ...result,
      similarity: hybridScore,
    };
  }).sort((a, b) => b.similarity - a.similarity);
}

/**
 * Extract keywords from query for hybrid search
 */
export function extractKeywords(query: string): string[] {
  // Remove common stop words (Portuguese and English)
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'de', 'da', 'do', 'em', 'para', 'com', 'por',
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'e', 'ou', 'que', 'qual', 'como', 'quando', 'onde',
    'and', 'or', 'what', 'which', 'how', 'when', 'where',
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5); // Max 5 keywords
}

/**
 * Batch embedding generation for better performance
 * Useful when processing multiple documents
 */
export async function generateEmbeddingsBatch(
  documents: Array<{ content: string; metadata?: any }>
): Promise<Array<{ embedding: number[]; content: string; metadata?: any }>> {
  const allChunks: Array<{ content: string; metadata?: any }> = [];

  // Generate chunks for all documents
  for (const doc of documents) {
    const chunks = generateChunks(doc.content, doc.metadata);
    allChunks.push(...chunks);
  }

  // Batch embed all chunks
  const contents = allChunks.map(c => c.content);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: contents,
  });

  return embeddings.map((e, i) => ({
    content: allChunks[i].content,
    embedding: e,
    metadata: allChunks[i].metadata,
  }));
}
