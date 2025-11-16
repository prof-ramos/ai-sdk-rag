# Guia de Integração com OpenRouter

Este guia explica como configurar e usar o OpenRouter para acessar diferentes modelos de LLM no chatbot.

## 🎯 Por Que Usar OpenRouter?

OpenRouter oferece:
- **Acesso unificado** a múltiplos modelos (OpenAI, Anthropic, Google, Meta, etc)
- **Roteamento automático** de modelos
- **Fallback automático** se um modelo falhar
- **Preços competitivos** e pay-per-use
- **API compatível** com OpenAI

## 🚀 Setup Rápido

### 1. Obter API Key

1. Acesse [OpenRouter](https://openrouter.ai/)
2. Crie uma conta
3. Gere uma API key em Settings → Keys
4. Copie a chave (formato: `sk-or-v1-...`)

### 2. Configurar Ambiente

Adicione ao `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Opcional: Informações do app para rankings
HTTP_REFERER=https://seu-site.com
X_TITLE=ChatBot Oficiais de Chancelaria
```

### 3. Atualizar Código para Usar OpenRouter

O código atual já suporta OpenRouter! Basta configurar o modelo no dashboard.

## 📋 Modelos Recomendados

### Para Produção (Alta Qualidade)

**OpenAI GPT-4o** - `openai/gpt-4o`
- ✅ Excelente compreensão de português
- ✅ Boa precisão em legislações
- ✅ Resposta rápida
- 💰 ~$5.00 / 1M tokens input

**Anthropic Claude 3.5 Sonnet** - `anthropic/claude-3.5-sonnet`
- ✅ Melhor em análise de textos longos
- ✅ Excelente em contexto jurídico
- ✅ 200K tokens de contexto
- 💰 ~$3.00 / 1M tokens input

**Anthropic Claude 3 Opus** - `anthropic/claude-3-opus`
- ✅ Máxima qualidade
- ✅ Ideal para legislações complexas
- 💰 ~$15.00 / 1M tokens input

### Para Desenvolvimento/Testes

**OpenAI GPT-3.5 Turbo** - `openai/gpt-3.5-turbo`
- ✅ Muito rápido
- ✅ Econômico
- 💰 ~$0.50 / 1M tokens input

**Meta Llama 3.1 70B** - `meta-llama/llama-3.1-70b-instruct`
- ✅ Open source
- ✅ Bom desempenho em português
- 💰 ~$0.88 / 1M tokens input

### Auto-Roteamento

**OpenRouter Auto** - `openrouter/auto`
- ✅ Seleciona automaticamente o melhor modelo
- ✅ Fallback se modelo principal falhar
- 💰 Custo variável

## 🔧 Configuração via Dashboard

1. Acesse `/admin/dashboard`
2. Vá para aba **Settings**
3. Em "Model Name", digite um dos modelos acima
4. Clique em "Save Model"

### Exemplos de Configuração:

**Para máxima qualidade:**
```
anthropic/claude-3-opus
```

**Para melhor custo-benefício:**
```
openai/gpt-4o
```

**Para testes:**
```
openai/gpt-3.5-turbo
```

**Auto-seleção:**
```
openrouter/auto
```

## 💻 Uso Programático

### Atualizar Modelo via API

```bash
curl -X PUT http://localhost:3000/api/admin/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-token=YOUR_TOKEN" \
  -d '{
    "key": "model_name",
    "value": "anthropic/claude-3.5-sonnet"
  }'
```

### Verificar Modelo Atual

```bash
curl http://localhost:3000/api/admin/settings \
  -H "Cookie: admin-token=YOUR_TOKEN"
```

## 🎨 Configuração Avançada

### Adicionar Parâmetros Customizados

Para adicionar `temperature`, `max_tokens`, etc., edite `/app/(preview)/api/chat/route.ts`:

```typescript
const result = streamText({
  model: modelName || "openai/gpt-4o",
  messages: convertToModelMessages(messages),
  system: systemPrompt || defaultSystemPrompt,

  // Parâmetros adicionais
  temperature: 0.7,           // Controle de aleatoriedade (0-2)
  maxTokens: 2000,           // Limite de tokens na resposta
  topP: 0.9,                 // Nucleus sampling
  frequencyPenalty: 0.5,     // Penaliza repetição (-2 a 2)
  presencePenalty: 0.3,      // Encoraja novos tópicos (-2 a 2)

  stopWhen: stepCountIs(5),
  tools: { /* ... */ },
});
```

### Salvar Parâmetros no Banco

Adicione novas settings:

```sql
INSERT INTO settings (id, key, value, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'temperature', '0.7', NOW(), NOW()),
  (gen_random_uuid(), 'max_tokens', '2000', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

E leia no código:

```typescript
const temperature = parseFloat(await getSetting("temperature") || "0.7");
const maxTokens = parseInt(await getSetting("max_tokens") || "2000");

const result = streamText({
  model: modelName || "openai/gpt-4o",
  temperature,
  maxTokens,
  // ...
});
```

## 📊 Comparação de Modelos

| Modelo | Qualidade | Velocidade | Custo | Português | Contexto |
|--------|-----------|------------|-------|-----------|----------|
| GPT-4o | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ | 💰💰💰 | ✅ Excelente | 128K |
| Claude 3.5 Sonnet | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ | 💰💰 | ✅ Excelente | 200K |
| Claude 3 Opus | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | 💰💰💰💰 | ✅ Excelente | 200K |
| GPT-3.5 Turbo | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 💰 | ✅ Bom | 16K |
| Llama 3.1 70B | ⭐⭐⭐⭐ | ⚡⚡⚡ | 💰 | ✅ Bom | 128K |

## 🔒 Segurança

### Proteger API Key

✅ **Nunca** commite `.env.local` no Git
✅ Use variáveis de ambiente no servidor
✅ Configure `OPENROUTER_API_KEY` no Vercel/hosting

### Rate Limiting

Implemente rate limiting para evitar custos excessivos:

```typescript
// Exemplo simples com Map
const requestCounts = new Map<string, number>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const count = requestCounts.get(ip) || 0;
  if (count > 100) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  requestCounts.set(ip, count + 1);

  // Resetar a cada hora
  setTimeout(() => requestCounts.delete(ip), 3600000);

  // ... resto do código
}
```

## 📈 Monitoramento de Custos

### Via Dashboard do OpenRouter

1. Acesse [OpenRouter Dashboard](https://openrouter.ai/activity)
2. Veja custos em tempo real
3. Configure alertas de spending

### Via Logs do Chatbot

Os logs já capturam qual modelo foi usado:

```sql
SELECT
  model,
  COUNT(*) as total_requests,
  DATE(created_at) as date
FROM chat_logs
GROUP BY model, DATE(created_at)
ORDER BY date DESC;
```

## 🐛 Troubleshooting

### Erro: "Invalid API key"

✅ Verifique se `OPENROUTER_API_KEY` está configurada
✅ Confirme que a chave começa com `sk-or-v1-`
✅ Regenere a chave no OpenRouter

### Erro: "Model not found"

✅ Verifique o nome do modelo no [OpenRouter Models](https://openrouter.ai/models)
✅ Use formato correto: `provider/model-name`
✅ Exemplos: `openai/gpt-4o`, `anthropic/claude-3-opus`

### Respostas em inglês

✅ Atualize o system prompt para enfatizar português
✅ Adicione ao prompt: "Sempre responda em português brasileiro"

### Custos muito altos

✅ Use `maxTokens` para limitar respostas
✅ Implemente rate limiting
✅ Considere modelos mais econômicos (GPT-3.5, Llama)
✅ Configure alertas no OpenRouter

## 📚 Recursos Adicionais

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Models List](https://openrouter.ai/models)
- [OpenRouter Pricing](https://openrouter.ai/docs#models)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## 🎯 Recomendação para Oficiais de Chancelaria

Para o chatbot de Oficiais de Chancelaria, recomendamos:

**Produção:**
- Modelo: `anthropic/claude-3.5-sonnet`
- Razão: Excelente em análise de textos legais + contexto grande (200K)
- Custo-benefício ideal

**Alternativa:**
- Modelo: `openai/gpt-4o`
- Razão: Mais rápido, também excelente em português

**Testes:**
- Modelo: `openai/gpt-3.5-turbo`
- Razão: Muito econômico para desenvolvimento

Configure via dashboard em `/admin/dashboard` → aba **Settings**.
