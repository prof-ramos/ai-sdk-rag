# Merge múltiplas features: Dashboard Admin, Web Search, Color Palette

## 📊 Resumo

Este PR consolida **3 branches de features** que estavam prontas para merge na main:

1. ✅ **Web Search com Perplexity** (`claude/review-rag-sdk-pr-016NwmwKB8T9Tw9CMnt6buuj`)
2. ✅ **Color Palette Institucional** (`claude/add-color-palette-012PyGKfVcMYAH5Fj8mk45jp`)
3. ✅ **Dashboard Admin Completo** (`claude/create-cha-dashboard-01SW79J4N5TJ7ZYuVqN7EuzW`)

---

## 🚀 Features Adicionadas

### 1. Web Search com Perplexity
- Modelo `sonar` específico para busca web
- Retry automático com exponential backoff (max 1 retry)
- Timeout de 10s para proteção
- Sanitização de input contra injection attacks
- Validação robusta de resposta
- Citações estruturadas
- **Arquivos:** `.env.example`, `README.md`, `lib/ai/web-search.ts`

### 2. Paleta de Cores Institucional
- Paleta de cores adicionada ao Tailwind
- Fix no processo de build para DATABASE_URL ausente
- Skip validação de env durante build
- **Arquivos:** `globals.css`, `tailwind.config.ts`, `lib/db/migrate.ts`, `lib/env.mjs`

### 3. Dashboard Admin Completo
- **Autenticação:** JWT + bcrypt (10 rounds)
- **4 Abas:** System Prompt, RAG Files, Chat Logs, Settings
- **Integração Portal da Transparência:** 6 tipos de consultas
- **Google Gemini 2.5:** Suporte completo com Thinking Mode
- **Model Selector:** Multi-provider (OpenAI, Gemini, Anthropic)
- **Chat Logs:** Histórico + exportação CSV
- **Documentação:** Guias completos em `/docs`
- **39 arquivos** alterados/adicionados

---

## 🗄️ Database Changes

Novas tabelas adicionadas:
- `admins` - Usuários administradores
- `chat_logs` - Histórico de conversas
- `settings` - Configurações do sistema

Tabela estendida:
- `resources` - Adicionados campos `title`, `document_type`, `source_url`

**Migrations:** `0001_superb_marauders.sql`, `0002_uneven_shriek.sql`

---

## 🔧 Breaking Changes

Nenhum! Todas as mudanças são backwards compatible.

Variáveis de ambiente novas (opcionais):
- `PERPLEXITY_API_KEY` - Para web search
- `AI_GATEWAY_API_KEY` - Para routing
- `JWT_SECRET` - Para admin auth
- `PORTAL_TRANSPARENCIA_API_KEY` - Para consultas públicas

---

## ✅ Conflitos Resolvidos

5 arquivos tinham conflitos, todos resolvidos:
- `.env.example` - Mescladas todas as API keys
- `README.md` - Combinadas features de todas as branches
- `lib/env.mjs` - Adicionado JWT_SECRET mantendo DATABASE_URL opcional
- `app/(preview)/api/chat/route.ts` - Adicionadas tools `searchWeb` + `consultarTransparencia`
- `app/(preview)/page.tsx` - Traduzidos nomes de tools para português

---

## 🧪 Test Plan

- [ ] Build bem-sucedido: `npm run build`
- [ ] Migrations executadas: `npm run db:migrate`
- [ ] Admin criado: `npm run create-admin`
- [ ] Login no dashboard funcional
- [ ] Web search funcionando
- [ ] Chat logs sendo salvos
- [ ] Portal da Transparência respondendo (se API key configurada)

---

## 📚 Documentação

Documentação completa adicionada em `/docs`:
- Setup Guide
- Admin Dashboard
- Gemini Integration
- Portal da Transparência Guide
- OpenRouter Guide
- Optimization Recommendations
- Prompt Oficial Chancelaria

---

## 🔍 Branches Analisadas (Não Mergeadas)

Outras branches do repositório:
- ❌ `claude/fix-api-retry-timeout-011LToQvFwYxffkBBcRUUA6V` - Vazia
- ❌ `codex/conduct-comprehensive-codebase-analysis` - Implementação Perplexity inferior (não usada)
- ✅ `claude/sofia-chatbot-rag-01LWmWEPyhm1zMtEEm6z8kqq` - Já mergeada via PR #2

---

**Commits:** 3 merges
- Perplexity web search improvements
- Color palette and build fixes
- Comprehensive admin dashboard

**Total:** 46 arquivos alterados
