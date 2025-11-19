import { embed, embedMany } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import { db } from "../db";

const embeddingModel = "openai/text-embedding-ada-002";

// Cache de embeddings para evitar chamadas duplicadas à API
const embeddingCache = new Map<string, number[]>();
const CACHE_MAX_SIZE = 1000;

/**
 * Gera chunks otimizados para legislações e documentos estruturados
 * Estratégia:
 * 1. Tenta dividir por artigos (legislações)
 * 2. Fallback: divide por parágrafos duplos
 * 3. Fallback final: divide por sentenças
 */
const generateChunks = (input: string): string[] => {
  const trimmedInput = input.trim();

  // Estratégia 1: Dividir por artigos (para legislações)
  // Padrões: "Art. 1º", "Art. 1°", "Art 1", "Artigo 1", etc.
  const articlePattern = /(?=(?:Art\.?|Artigo)\s*\d+)/i;
  const articles = trimmedInput.split(articlePattern);

  if (articles.length > 1) {
    // Encontrou artigos - retorna chunks por artigo
    return articles
      .map(article => article.trim())
      .filter(article => article.length > 20); // Ignora chunks muito pequenos
  }

  // Estratégia 2: Dividir por parágrafos duplos
  const paragraphs = trimmedInput.split(/\n\n+/);

  if (paragraphs.length > 1) {
    const validParagraphs = paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 30);

    if (validParagraphs.length > 0) {
      return validParagraphs;
    }
  }

  // Estratégia 3: Dividir por sentenças (fallback original)
  return trimmedInput
    .split(".")
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 10)
    .map(chunk => chunk + ".");
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\n", " ");
  const cacheKey = input.toLowerCase().trim();

  // Verificar cache primeiro
  if (embeddingCache.has(cacheKey)) {
    console.log("🎯 Cache hit for embedding");
    return embeddingCache.get(cacheKey)!;
  }

  // Gerar novo embedding
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });

  // Adicionar ao cache
  embeddingCache.set(cacheKey, embedding);

  // Limitar tamanho do cache (FIFO)
  if (embeddingCache.size > CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) {
      embeddingCache.delete(firstKey);
    }
  }

  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;
  const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.3))
    .orderBy((t) => desc(t.similarity))
    .limit(4);
  return similarGuides;
};
