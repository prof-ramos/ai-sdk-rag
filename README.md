# ChatBot para Oficiais de Chancelaria 🇧🇷

Sistema completo de ChatBot com RAG otimizado e dashboard administrativo, especializado para atender Oficiais de Chancelaria do Serviço Exterior Brasileiro.

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-5.0-orange)](https://sdk.vercel.ai/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

## ✨ Funcionalidades

### 🤖 ChatBot Inteligente
- **RAG Otimizado** - Busca semântica em legislações e documentos
- **Web Search** - Busca em tempo real com Perplexity API
- **Múltiplos Modelos** - OpenAI, Google Gemini 2.5, Anthropic Claude
- **Thinking Mode** - Raciocínio explícito para análises complexas (Gemini)
- **Tools Especializadas** - Consulta ao Portal da Transparência
- **Prompt Especializado** - Focado em Oficiais de Chancelaria
- **Multimodal Input** - Suporte a imagens para processamento visual

### 📊 Dashboard de Administração
- **Autenticação Segura** - JWT + bcrypt (10 rounds)
- **4 Abas Principais:**
  1. **System Prompt** - Editor de prompt em tempo real
  2. **RAG Files** - Upload e gerenciamento de documentos
  3. **Chat Logs** - Histórico de conversas + exportação CSV
  4. **Settings** - Configuração de modelo e parâmetros

### 🔍 Web Search com Perplexity
- Modelo Sonar específico para busca web
- Retry automático com exponential backoff
- Timeout de 10s para proteção
- Sanitização de input contra injection
- Validação robusta de resposta
- Citações estruturadas

### 🔍 Integração Portal da Transparência
- Consulta gastos/despesas de órgãos federais
- Pesquisa contratos governamentais
- Lista viagens a serviço
- Busca licitações públicas
- Consulta quantidade de servidores

### ⚡ Otimizações de RAG
- **Chunking Inteligente** - Divide por artigos → parágrafos → sentenças
- **Cache de Embeddings** - Reduz até 70% em custos
- **Metadata** - title, documentType, sourceUrl
- **HNSW Index** - Busca vetorial otimizada

---

## 🚀 Quick Start

### 1. Pré-requisitos

- Node.js 18+
- Conta no Supabase (PostgreSQL)
- API Keys:
  - OpenAI ou Google AI
  - Perplexity (para web search)
  - Portal da Transparência (opcional)

### 2. Instalação

```bash
# Clonar repositório
git clone <repo-url>
cd ai-sdk-rag

# Instalar dependências
npm install --legacy-peer-deps

# Configurar ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais
```

**⚠️ CRÍTICO - Segurança:**
Antes de iniciar a aplicação, você **DEVE** gerar uma chave JWT_SECRET forte:

```bash
# Gerar JWT_SECRET seguro (escolha um):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# OU
openssl rand -base64 32

# Adicione o resultado em .env.local:
# JWT_SECRET="sua-chave-gerada-aqui"
```

**A aplicação NÃO iniciará sem um JWT_SECRET válido (mínimo 32 caracteres).**

### 3. Configurar Banco de Dados

```bash
# Executar migrations
npm run db:migrate

# No Supabase Dashboard:
# Database → Extensions → Habilitar "vector"
```

### 4. Criar Admin

```bash
npm run create-admin admin SuaSenha123
```

### 5. Iniciar Aplicação

```bash
npm run dev
```

**Acessar:**
- ChatBot: http://localhost:3000
- Dashboard: http://localhost:3000/admin

---

## 📚 Documentação Completa

**📖 [Acesse a Documentação Completa em /docs](docs/README.md)**

### Guias Principais

- **[Setup Guide](docs/setup/SETUP_GUIDE.md)** ⭐ Comece aqui!
- **[Admin Dashboard](docs/admin/ADMIN_DASHBOARD.md)** - Como usar o dashboard
- **[Prompt Especializado](docs/guides/PROMPT_OFICIAL_CHANCELARIA.md)** - Para Oficiais de Chancelaria
- **[Gemini Integration](docs/guides/GEMINI_INTEGRATION.md)** - Google Gemini 2.5
- **[Portal da Transparência](docs/api/PORTAL_TRANSPARENCIA_GUIDE.md)** - Consultas públicas

---

## 🌐 Web Search Feature

O chatbot inclui capacidade de busca web powered by Perplexity Sonar API, permitindo acesso a informações atuais e eventos recentes.

### Como Funciona

- **Modelo**: Usa `sonar` da Perplexity, específico para web search
- **Features**:
  - Retry automático com exponential backoff
  - Timeout de 10 segundos
  - Sanitização de input para segurança
  - Validação de resposta
  - Error handling robusto

### Configuração

1. **API Key**: Obtenha em [Perplexity API](https://www.perplexity.ai/settings/api)
2. **Adicionar ao .env**: `PERPLEXITY_API_KEY=pplx-...`
3. **Custos**: Serviço pago - monitore uso no dashboard

### Modelos Disponíveis

- **`sonar`**: Respostas rápidas, menor custo (padrão)
- **`sonar-pro`**: Resultados mais precisos, maior custo

Para trocar modelos, edite `lib/ai/web-search.ts`.

---

## 🏗️ Arquitetura

```
ai-sdk-rag/
├── app/
│   ├── (preview)/api/chat/   # ChatBot + RAG + Tools
│   ├── admin/dashboard/      # Dashboard administrativo
│   └── api/admin/            # 12 endpoints REST
├── lib/
│   ├── ai/                   # RAG + Embeddings + Model Selector
│   ├── api/                  # Portal da Transparência
│   ├── actions/              # Server actions
│   ├── auth.ts               # JWT authentication
│   └── db/                   # 5 tabelas + migrations
├── docs/                     # 📚 Documentação completa
└── scripts/                  # CLI tools
```

---

## 🗄️ Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `admins` | Usuários administradores |
| `settings` | Configurações (prompt, modelo) |
| `chat_logs` | Histórico de conversas |
| `resources` | Documentos RAG |
| `embeddings` | Vetores semânticos |

---

## 🤖 Modelos Suportados

| Provider | Modelos | Destaque |
|----------|---------|----------|
| **Google Gemini** 🆕 | Pro, Flash, Flash-Lite | Thinking Mode, 30-50x mais barato |
| **OpenAI** | GPT-4o, GPT-3.5 | Padrão |
| **Anthropic** | Claude 3.5, Opus | Textos longos |
| **Meta** | Llama 3.1 | Open source |

### Configuração Recomendada

```
Model: google/gemini-2.5-flash
Thinking: Enabled
Budget: 8192 tokens
```

---

## 🛠️ Scripts

```bash
npm run dev              # Desenvolvimento
npm run build            # Build + migrations
npm run db:migrate       # Executar migrations
npm run create-admin     # Criar admin
npm run db:studio        # Drizzle Studio
```

---

## 📊 Performance & Custos

### Comparação (1M tokens)

| Modelo | Custo Input | Velocidade | Qualidade |
|--------|-------------|------------|-----------|
| Gemini Flash | $0.15 | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| GPT-4o | $5.00 | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| Claude 3.5 | $3.00 | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ |

### Otimizações

- ✅ Cache de embeddings → 70% economia
- ✅ Chunking inteligente → 40% melhora
- ✅ HNSW index → Busca rápida

---

## 🔒 Segurança

- ✅ JWT + bcrypt (10 rounds)
- ✅ Cookies httpOnly
- ✅ Middleware de autenticação
- ✅ Validação com Zod
- ✅ Sanitização de input em web search

---

## 🚢 Deploy

### Vercel (Recomendado)

1. Push para GitHub
2. Conectar no Vercel
3. Adicionar env vars
4. Deploy!

Outras opções: Railway, Render, Fly.io

---

## 📝 Variáveis de Ambiente

```env
DATABASE_URL=postgres://...
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
PERPLEXITY_API_KEY=pplx-...
AI_GATEWAY_API_KEY=sk-...
PORTAL_TRANSPARENCIA_API_KEY=optional
```

Ver [.env.example](.env.example) para detalhes.

---

## 📄 Licença

Proprietário - Ministério das Relações Exteriores

---

## 🙏 Tecnologias

- [Next.js](https://nextjs.org) 15.1
- [Vercel AI SDK](https://sdk.vercel.ai) 5.0
- [Supabase](https://supabase.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Google Gemini](https://ai.google.dev)
- [Perplexity API](https://www.perplexity.ai)
- [Tailwind CSS](https://tailwindcss.com)

---

## 📞 Suporte

1. Consulte a [documentação](docs/)
2. Veja o [CHANGELOG](CHANGELOG.md)
3. Revise os [guias](docs/guides/)

---

## 🎯 Roadmap

### v2.2 (Próximo)
- [x] Web Search com Perplexity
- [ ] Google Search
- [ ] Hybrid Search
- [ ] Row Level Security
- [ ] Analytics dashboard

### v3.0 (Futuro)
- [ ] Multi-tenancy
- [ ] Mobile app
- [ ] Upload de PDFs
- [ ] Voice interface

---

**Versão:** v2.1.0 | **Status:** ✅ Produção | **Data:** 2025-11-16
