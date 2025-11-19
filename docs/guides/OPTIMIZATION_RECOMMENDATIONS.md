# Recomendações de Otimização - RAG com Supabase

Baseado nas best practices da Supabase e Vercel AI SDK.

## ✅ O Que Já Está Implementado Corretamente

1. **Vector Embeddings** - Usando `vector(1536)` compatível com OpenAI
2. **HNSW Index** - Índice otimizado para busca vetorial
3. **Cascade Delete** - Embeddings são deletados automaticamente com resources
4. **Connection Pooling** - Usando Supabase pooler URLs
5. **Drizzle ORM** - Type-safe database queries
6. **Chunking Strategy** - Divisão por sentenças

## 🚀 Melhorias Opcionais Recomendadas

### 1. Row Level Security (RLS)

**O que é:** Garante que apenas usuários autorizados acessem dados específicos.

**Status atual:** Não implementado (não crítico pois o acesso é admin-only)

**Como implementar (SQL no Supabase):**

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Política para resources (apenas admins)
CREATE POLICY "Admins can access all resources"
  ON resources
  FOR ALL
  TO authenticated
  USING (true);

-- Política para embeddings (cascata via resources)
CREATE POLICY "Admins can access all embeddings"
  ON embeddings
  FOR ALL
  TO authenticated
  USING (true);

-- Política para logs (apenas admins)
CREATE POLICY "Admins can access all logs"
  ON chat_logs
  FOR SELECT
  TO authenticated
  USING (true);
```

**Prioridade:** 🟡 Média (recomendado para produção)

---

### 2. Hybrid Search (Full-Text + Vector)

**O que é:** Combina busca semântica (vetores) com busca por palavras-chave (full-text).

**Benefícios:**
- Melhor recall (encontra mais resultados relevantes)
- Combina precisão semântica com matches exatos
- Usa Reciprocal Rank Fusion (RRF) para ranking

**Como implementar:**

#### Passo 1: Adicionar índice full-text

```sql
-- Adicionar coluna tsvector para busca full-text
ALTER TABLE embeddings ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED;

-- Criar índice GIN para performance
CREATE INDEX embeddings_content_tsv_idx ON embeddings USING GIN(content_tsv);
```

#### Passo 2: Criar função RRF no Supabase

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id VARCHAR,
  content TEXT,
  similarity FLOAT,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    SELECT
      e.id,
      e.content,
      1 - (e.embedding <=> query_embedding) AS similarity,
      ROW_NUMBER() OVER (ORDER BY e.embedding <=> query_embedding) AS rank
    FROM embeddings e
    ORDER BY e.embedding <=> query_embedding
    LIMIT 20
  ),
  fulltext_search AS (
    SELECT
      e.id,
      e.content,
      ts_rank(e.content_tsv, websearch_to_tsquery('portuguese', query_text)) AS relevance,
      ROW_NUMBER() OVER (ORDER BY ts_rank(e.content_tsv, websearch_to_tsquery('portuguese', query_text)) DESC) AS rank
    FROM embeddings e
    WHERE e.content_tsv @@ websearch_to_tsquery('portuguese', query_text)
    ORDER BY relevance DESC
    LIMIT 20
  )
  SELECT
    COALESCE(s.id, f.id) AS id,
    COALESCE(s.content, f.content) AS content,
    COALESCE(s.similarity, 0) AS similarity,
    COALESCE(f.relevance, 0) AS relevance
  FROM semantic_search s
  FULL OUTER JOIN fulltext_search f ON s.id = f.id
  ORDER BY (COALESCE(1.0 / (s.rank + 1), 0) + COALESCE(1.0 / (f.rank + 1), 0)) DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

#### Passo 3: Atualizar `lib/ai/embedding.ts`

```typescript
// Adicionar função de hybrid search
export async function findRelevantContentHybrid(userQuery: string) {
  const embedding = await generateEmbedding(userQuery);

  const result = await db.execute(sql`
    SELECT * FROM hybrid_search(
      ${userQuery},
      ${JSON.stringify(embedding)}::vector,
      5
    )
  `);

  return result.rows;
}
```

**Prioridade:** 🟢 Alta (melhora significativa na qualidade)

---

### 3. Metadados nos Embeddings

**O que é:** Adicionar informações contextuais aos embeddings para melhor filtragem.

**Como implementar:**

#### Passo 1: Atualizar schema

```typescript
// lib/db/schema/embeddings.ts
export const embeddings = pgTable("embeddings", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  resourceId: varchar("resource_id", { length: 191 }).references(() => resources.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),

  // Novos campos de metadata
  documentType: varchar("document_type", { length: 100 }), // "lei", "decreto", "portaria", etc
  documentNumber: varchar("document_number", { length: 100 }), // "Lei 1234/2020"
  articleReference: varchar("article_reference", { length: 100 }), // "Art. 5º"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});
```

#### Passo 2: Atualizar resources para incluir metadata

```typescript
// lib/db/schema/resources.ts
export const resources = pgTable("resources", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  content: text("content").notNull(),

  // Metadata adicional
  title: text("title"), // Nome da legislação
  documentType: varchar("document_type", { length: 100 }), // Tipo
  sourceUrl: text("source_url"), // Link oficial

  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});
```

#### Passo 3: Filtrar por metadata na busca

```typescript
export async function findRelevantContentByType(
  userQuery: string,
  documentType?: string
) {
  const embedding = await generateEmbedding(userQuery);

  let query = db
    .select()
    .from(embeddings)
    .where(
      sql`1 - (${embeddings.embedding} <=> ${embedding}) > 0.3`
    );

  if (documentType) {
    query = query.where(eq(embeddings.documentType, documentType));
  }

  return query.orderBy(
    sql`${embeddings.embedding} <=> ${embedding}`
  ).limit(5);
}
```

**Prioridade:** 🟡 Média (útil para legislações específicas)

---

### 4. Chunking Inteligente

**O que é:** Melhorar a estratégia de divisão de documentos.

**Problema atual:** Divisão simples por pontos (`.`) pode quebrar contexto.

**Solução recomendada:**

```typescript
// lib/ai/embedding.ts - Melhorar generateChunks

export const generateChunks = (input: string): string[] => {
  // Estratégia para legislações
  const chunks: string[] = [];

  // 1. Tentar dividir por artigos
  const articles = input.split(/(?=Art\.?\s+\d+)/i);

  if (articles.length > 1) {
    // É uma legislação estruturada
    return articles.map(art => art.trim()).filter(art => art.length > 10);
  }

  // 2. Fallback: dividir por parágrafos
  const paragraphs = input.split(/\n\n+/);

  if (paragraphs.length > 1) {
    return paragraphs.map(p => p.trim()).filter(p => p.length > 20);
  }

  // 3. Fallback final: dividir por sentenças (atual)
  return input
    .trim()
    .split(".")
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => chunk.trim() + ".");
};
```

**Prioridade:** 🟢 Alta (melhora recall para legislações)

---

### 5. Cache de Embeddings

**O que é:** Evitar gerar embeddings duplicados para a mesma query.

**Como implementar:**

```typescript
// lib/ai/embedding-cache.ts
const embeddingCache = new Map<string, number[]>();

export async function generateEmbeddingCached(text: string) {
  const cacheKey = text.toLowerCase().trim();

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const embedding = await generateEmbedding(text);
  embeddingCache.set(cacheKey, embedding);

  // Limitar tamanho do cache
  if (embeddingCache.size > 1000) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }

  return embedding;
}
```

**Prioridade:** 🟢 Alta (reduz custos e latência)

---

### 6. Reranking com Cross-Encoder

**O que é:** Após recuperar resultados, re-ordenar usando um modelo mais preciso.

**Como implementar:**

```typescript
import { pipeline } from '@huggingface/transformers';

// Carregar modelo de reranking
const reranker = await pipeline('text-classification',
  'cross-encoder/ms-marco-MiniLM-L-6-v2'
);

export async function rerankResults(query: string, results: any[]) {
  const scores = await Promise.all(
    results.map(async (result) => {
      const score = await reranker(`${query} [SEP] ${result.content}`);
      return { ...result, rerankScore: score };
    })
  );

  return scores.sort((a, b) => b.rerankScore - a.rerankScore);
}
```

**Prioridade:** 🟡 Média (melhora precision, mas adiciona latência)

---

### 7. Telemetria e Analytics

**O que é:** Monitorar qualidade das respostas e uso.

**Como implementar:**

```typescript
// lib/analytics.ts
export async function logRAGMetrics({
  query,
  retrievedDocs,
  usedInResponse,
  userFeedback,
}: {
  query: string;
  retrievedDocs: number;
  usedInResponse: boolean;
  userFeedback?: 'positive' | 'negative';
}) {
  await db.insert(ragMetrics).values({
    query,
    retrievedDocs,
    usedInResponse,
    userFeedback,
    timestamp: new Date(),
  });
}
```

**Prioridade:** 🟡 Média (importante para iteração)

---

## 📊 Priorização Recomendada

### Para Implementar Agora (Alto Impacto):
1. ✅ **Hybrid Search** - Melhora significativa na qualidade
2. ✅ **Chunking Inteligente** - Essencial para legislações
3. ✅ **Cache de Embeddings** - Reduz custos e latência

### Para Implementar em Produção:
4. 🔒 **Row Level Security** - Segurança
5. 📊 **Telemetria** - Monitoramento

### Para Considerar Futuramente:
6. 📝 **Metadados nos Embeddings** - Filtragem avançada
7. 🎯 **Reranking** - Precision adicional

---

## 🔍 Verificações Pré-Produção

- [ ] Extensão `vector` habilitada no Supabase
- [ ] Índices criados (HNSW para vetores)
- [ ] RLS configurado e testado
- [ ] Backup do banco configurado
- [ ] Monitoramento de performance (Supabase Dashboard)
- [ ] Rate limiting nas APIs
- [ ] HTTPS configurado
- [ ] Variáveis de ambiente seguras
- [ ] OPENAI_API_KEY configurada
- [ ] Testes com queries reais

---

## 📚 Recursos Adicionais

- [Supabase Vector Docs](https://supabase.com/docs/guides/ai)
- [Vercel AI SDK RAG Guide](https://sdk.vercel.ai/docs)
- [OpenAI Embeddings Best Practices](https://platform.openai.com/docs/guides/embeddings)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
