# Integração com Google Gemini 2.5

Guia completo para usar o **Gemini 2.5** no ChatBot de Oficiais de Chancelaria.

## 🎯 Por Que Usar Gemini 2.5?

### Vantagens do Gemini 2.5

✅ **Reasoning Avançado** - Modo "thinking" para problemas complexos
✅ **Google Search** - Acesso a informações atualizadas via busca
✅ **Multilíngue** - Excelente suporte a português
✅ **Contexto Grande** - Até 2M tokens (Gemini 2.5 Pro)
✅ **Custo-Benefício** - Flash-Lite é muito econômico
✅ **Tool Calling** - Suporte nativo a ferramentas

---

## 📊 Família de Modelos Gemini 2.5

| Modelo | Uso Ideal | Contexto | Custo | Velocidade |
|--------|-----------|----------|-------|------------|
| **Gemini 2.5 Pro** | Tarefas complexas, coding | 2M tokens | 💰💰💰 | ⚡⚡⚡ |
| **Gemini 2.5 Flash** | Uso geral, dia a dia | 1M tokens | 💰💰 | ⚡⚡⚡⚡ |
| **Gemini 2.5 Flash-Lite** | Alto volume, econômico | 1M tokens | 💰 | ⚡⚡⚡⚡⚡ |

---

## 🚀 Setup Rápido

### 1. Instalar Provider do Google

```bash
npm install @ai-sdk/google --legacy-peer-deps
```

### 2. Obter API Key

1. Acesse [Google AI Studio](https://aistudio.google.com/apikey)
2. Crie uma API key
3. Copie a chave

### 3. Configurar Ambiente

Adicione ao `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your-key-here
```

### 4. Atualizar Código do Chat

Edite `/app/(preview)/api/chat/route.ts`:

```typescript
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google"; // Adicionar

// ... resto do código

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const systemPrompt = await getSetting("system_prompt");
  const modelName = await getSetting("model_name");

  // Determinar provider baseado no nome do modelo
  let model;
  if (modelName?.startsWith("google/") || modelName?.startsWith("gemini-")) {
    // Usar Gemini
    const geminiModel = modelName.replace("google/", "").replace("gemini-", "");
    model = google(geminiModel);
  } else {
    // Fallback para OpenAI/OpenRouter
    model = modelName || "openai/gpt-4o";
  }

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    system: systemPrompt || defaultSystemPrompt,
    stopWhen: stepCountIs(5),
    tools: { /* ... */ },
    onFinish: async ({ text, usage }) => { /* ... */ },
  });

  return result.toUIMessageStreamResponse();
}
```

---

## 🧠 Thinking Mode (Modo Raciocínio)

O Gemini 2.5 possui capacidade de "pensar" antes de responder, ideal para legislações complexas.

### Habilitar Thinking Mode

```typescript
const result = streamText({
  model: google("gemini-2.5-flash"),
  messages: convertToModelMessages(messages),
  system: systemPrompt || defaultSystemPrompt,

  // Configurar thinking
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 8192,      // Tokens para "pensar" (até 16K)
        includeThoughts: true,      // Incluir resumo do raciocínio
      },
    },
  },

  tools: { /* ... */ },
});

// Acessar o raciocínio
console.log(result.reasoning); // Resumo do pensamento do modelo
```

### Quando Usar Thinking Mode

✅ **Análise de legislações complexas** - Artigos inter-relacionados
✅ **Questões multi-etapas** - Requerem planejamento
✅ **Raciocínio jurídico** - Interpretação de normas
❌ **Perguntas simples** - Adiciona latência desnecessária

---

## 🔍 Google Search Integration

Permite que o Gemini acesse informações atualizadas via Google Search.

### Habilitar Google Search

```typescript
import { google } from "@ai-sdk/google";

const result = streamText({
  model: google("gemini-2.5-flash"),
  messages: convertToModelMessages(messages),

  // Adicionar ferramenta de busca
  tools: {
    google_search: google.tools.googleSearch({}),
    // ... outras ferramentas (addResource, getInformation)
  },

  stopWhen: stepCountIs(5),
});

// Acessar metadados de grounding
const metadata = result.providerMetadata?.google;
const groundingMetadata = metadata?.groundingMetadata;
const sources = metadata?.searchQueries;
```

### Casos de Uso para Google Search

✅ **Legislações recentes** - Publicadas após treinamento do modelo
✅ **Jurisprudência atual** - Decisões judiciais recentes
✅ **Notícias do setor** - Atualizações do Itamaraty
❌ **Informações já no RAG** - Use o RAG local primeiro

### ⚠️ Importante sobre Google Search

- **Custo adicional** por query de busca
- **Latência maior** (precisa fazer busca antes de responder)
- **Use com moderação** - Só quando RAG não tiver a informação

---

## 🎛️ Configuração via Dashboard

### Opção 1: Gemini Flash (Recomendado para Produção)

No dashboard (`/admin/dashboard` → aba **Settings**):

```
Model Name: google/gemini-2.5-flash
```

ou

```
Model Name: gemini-2.5-flash
```

### Opção 2: Gemini Flash-Lite (Econômico)

```
Model Name: google/gemini-2.5-flash-lite
```

### Opção 3: Gemini Pro (Máxima Qualidade)

```
Model Name: google/gemini-2.5-pro
```

---

## 💻 Configuração Avançada

### Salvar Thinking Config no Banco

Adicione novas settings:

```sql
INSERT INTO settings (id, key, value, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'thinking_enabled', 'true', NOW(), NOW()),
  (gen_random_uuid(), 'thinking_budget', '8192', NOW(), NOW()),
  (gen_random_uuid(), 'google_search_enabled', 'false', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Atualizar Código para Usar Settings

```typescript
const thinkingEnabled = (await getSetting("thinking_enabled")) === "true";
const thinkingBudget = parseInt(await getSetting("thinking_budget") || "8192");
const googleSearchEnabled = (await getSetting("google_search_enabled")) === "true";

const providerOptions = modelName?.startsWith("google/") || modelName?.startsWith("gemini-")
  ? {
      google: {
        thinkingConfig: thinkingEnabled ? {
          thinkingBudget,
          includeThoughts: true,
        } : undefined,
      },
    }
  : undefined;

const tools: any = {
  addResource: tool({ /* ... */ }),
  getInformation: tool({ /* ... */ }),
  understandQuery: tool({ /* ... */ }),
};

// Adicionar Google Search se habilitado
if (googleSearchEnabled && (modelName?.startsWith("google/") || modelName?.startsWith("gemini-"))) {
  tools.google_search = google.tools.googleSearch({});
}

const result = streamText({
  model,
  messages: convertToModelMessages(messages),
  system: systemPrompt || defaultSystemPrompt,
  providerOptions,
  tools,
  stopWhen: stepCountIs(5),
  onFinish: async ({ text, usage, reasoning }) => {
    // Salvar reasoning se disponível
    const context = { usage, reasoning };
    await createChatLog({ /* ... */, context });
  },
});
```

---

## 📊 Comparação: Gemini vs OpenAI vs Claude

| Critério | Gemini 2.5 Flash | GPT-4o | Claude 3.5 Sonnet |
|----------|------------------|--------|-------------------|
| **Qualidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Velocidade** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡⚡ |
| **Custo (1M tokens)** | $0.15 | $5.00 | $3.00 |
| **Contexto** | 1M tokens | 128K | 200K |
| **Português** | ✅ Excelente | ✅ Excelente | ✅ Excelente |
| **Thinking Mode** | ✅ Sim | ❌ Não | ❌ Não |
| **Google Search** | ✅ Sim | ❌ Não | ❌ Não |
| **Legislações** | ✅ Excelente | ✅ Excelente | ✅ Melhor |

---

## 🎯 Recomendação para Oficiais de Chancelaria

### Cenário 1: Produção com Orçamento Normal

**Modelo:** `google/gemini-2.5-flash`

**Razões:**
- Custo 30x menor que GPT-4o
- Velocidade excelente
- Qualidade comparável
- Thinking mode para legislações complexas

**Configuração:**
```
Model Name: google/gemini-2.5-flash
Thinking Enabled: true
Thinking Budget: 8192
Google Search: false (use RAG primeiro)
```

### Cenário 2: Alto Volume / Budget Limitado

**Modelo:** `google/gemini-2.5-flash-lite`

**Razões:**
- Custo ultra-baixo
- Velocidade máxima
- Ideal para perguntas frequentes

### Cenário 3: Máxima Qualidade

**Modelo:** Híbrido
- Use `anthropic/claude-3.5-sonnet` para análises complexas
- Use `google/gemini-2.5-flash` para perguntas gerais
- Implemente seleção automática baseada na complexidade

---

## 🔧 Implementação Completa

### 1. Atualizar package.json

```bash
npm install @ai-sdk/google --legacy-peer-deps
```

### 2. Criar Helper para Seleção de Modelo

Crie `/lib/ai/model-selector.ts`:

```typescript
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export function getModel(modelName: string) {
  // Gemini
  if (modelName?.startsWith("google/") || modelName?.startsWith("gemini-")) {
    const geminiModel = modelName
      .replace("google/", "")
      .replace("gemini-", "");
    return google(geminiModel);
  }

  // Anthropic via OpenRouter
  if (modelName?.startsWith("anthropic/")) {
    return openai(modelName); // OpenRouter é compatível com OpenAI SDK
  }

  // OpenAI ou OpenRouter
  return openai(modelName || "gpt-4o");
}
```

### 3. Atualizar Route Handler

```typescript
import { getModel } from "@/lib/ai/model-selector";

const model = getModel(modelName || "google/gemini-2.5-flash");

const result = streamText({
  model,
  messages: convertToModelMessages(messages),
  system: systemPrompt || defaultSystemPrompt,
  stopWhen: stepCountIs(5),
  tools: { /* ... */ },
});
```

---

## 📈 Monitoramento

### Logs de Reasoning

Adicione ao `onFinish`:

```typescript
onFinish: async ({ text, usage, reasoning }) => {
  console.log("💭 Reasoning:", reasoning);
  console.log("📊 Tokens:", usage);

  await createChatLog({
    userId: userIp,
    question: /* ... */,
    answer: text,
    model: modelName || "google/gemini-2.5-flash",
    context: {
      usage,
      reasoning,
      thinkingTokens: usage.thinkingTokens, // Se thinking habilitado
    },
  });
}
```

### Monitorar Custos

```sql
-- Custo por modelo (aproximado)
SELECT
  model,
  COUNT(*) as requests,
  SUM(
    CASE
      WHEN model LIKE '%gemini-2.5-flash-lite%' THEN 0.00001 -- ~$0.01/1M tokens
      WHEN model LIKE '%gemini-2.5-flash%' THEN 0.00015      -- ~$0.15/1M tokens
      WHEN model LIKE '%gemini-2.5-pro%' THEN 0.001          -- ~$1.00/1M tokens
      ELSE 0.005                                             -- Outros modelos
    END
  ) as estimated_cost_usd
FROM chat_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model
ORDER BY requests DESC;
```

---

## 🐛 Troubleshooting

### Erro: "Invalid API key"

✅ Verifique se `GOOGLE_GENERATIVE_AI_API_KEY` está configurada
✅ Gere nova chave em [AI Studio](https://aistudio.google.com/apikey)
✅ Confirme que a chave está ativa

### Thinking Mode não funciona

✅ Apenas modelos Gemini 2.5+ suportam thinking
✅ Verifique `thinkingBudget` (min: 1024, max: 16384)
✅ Use `includeThoughts: true` para ver raciocínio

### Google Search retorna erro

✅ Google Search requer billing habilitado
✅ Verifique quota de API
✅ Use `DynamicRetrievalConfig` para controlar quando buscar

### Respostas em inglês

✅ Atualize system prompt: "Sempre responda em português brasileiro"
✅ Use exemplos em português no prompt
✅ Gemini 2.5 tem excelente suporte a PT-BR

---

## 📚 Recursos

- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [AI SDK Google Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini Pricing](https://ai.google.dev/pricing)

---

## ✅ Checklist de Implementação

- [ ] Instalar `@ai-sdk/google`
- [ ] Obter Google AI API Key
- [ ] Adicionar `GOOGLE_GENERATIVE_AI_API_KEY` ao `.env.local`
- [ ] Atualizar route handler para suportar Gemini
- [ ] Configurar modelo no dashboard
- [ ] Testar thinking mode
- [ ] (Opcional) Implementar Google Search
- [ ] Monitorar custos e performance
- [ ] Documentar para equipe

---

## 💡 Dica Final

Para ChatBot de Oficiais de Chancelaria, a configuração ideal é:

```
Modelo: google/gemini-2.5-flash
Thinking: Habilitado (budget 8192)
Google Search: Desabilitado (use RAG local)
Temperatura: 0.7
Max Tokens: 2000
```

Isso oferece o melhor equilíbrio entre **qualidade**, **velocidade** e **custo**! 🚀
