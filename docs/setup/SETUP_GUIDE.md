# Guia de Setup - ChatBot para Oficiais de Chancelaria

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (já configurada)
- Credenciais do banco de dados (já fornecidas)

## 🚀 Setup Inicial

### 1. Instalar Dependências

```bash
npm install --legacy-peer-deps
```

### 2. Configurar Variáveis de Ambiente

As variáveis já foram configuradas no arquivo `.env.local`:

```env
# Database Configuration (Supabase)
DATABASE_URL="postgres://postgres.fybtwydytndbwsvtgngo:Skcyp3zw4TFDT0Rs@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Auth
JWT_SECRET="QwqRcBZSi7IXE6SqsDf+1ZSUVzQHOkA6T97pZggMb6iQBh2KNXpBezBAWDrKJzpunEk7c/ua6nwD9BUaykScQw=="

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://fybtwydytndbwsvtgngo.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### 3. Executar Migrations do Banco de Dados

#### Opção A: Via Comando npm (Recomendado)

```bash
npm run db:migrate
```

Isso criará automaticamente as seguintes tabelas:
- `admins` - Usuários administradores
- `settings` - Configurações do sistema
- `chat_logs` - Logs de conversas
- `resources` - Documentos do RAG
- `embeddings` - Embeddings vetoriais

#### Opção B: Via Drizzle Push

Se a opção A falhar, tente:

```bash
npm run db:push
```

#### Opção C: Executar SQL Manualmente no Supabase

1. Acesse o [Supabase Dashboard](https://fybtwydytndbwsvtgngo.supabase.co)
2. Vá em SQL Editor
3. Execute o arquivo `lib/db/migrations/0001_superb_marauders.sql`

### 4. Habilitar a Extensão Vector no Supabase

**IMPORTANTE**: O Supabase precisa da extensão `vector` para armazenar embeddings.

1. Acesse o Supabase Dashboard
2. Vá em **Database** → **Extensions**
3. Procure por `vector` ou `pgvector`
4. Clique em **Enable**

Ou execute via SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Criar Primeiro Usuário Admin

```bash
npm run create-admin admin SuaSenhaSegura123
```

Substitua `admin` e `SuaSenhaSegura123` pelo username e senha desejados.

### 6. Configurar o Prompt do Sistema

Após criar o admin, você pode:

#### Opção A: Via Dashboard
1. Acesse `/admin` e faça login
2. Vá para a aba "System Prompt"
3. Cole o prompt do arquivo `PROMPT_OFICIAL_CHANCELARIA.md`
4. Clique em "Save Prompt"

#### Opção B: Inserir diretamente no banco

Execute no SQL Editor do Supabase:

```sql
INSERT INTO settings (id, key, value, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'system_prompt',
  'Você é um assistente especializado em orientar Oficiais de Chancelaria do Serviço Exterior Brasileiro.

IMPORTANTE - Esclarecimento sobre a carreira:
- Oficiais de Chancelaria são membros de uma carreira específica do Serviço Exterior Brasileiro
- Oficiais de Chancelaria NÃO são diplomatas
- Oficiais de Chancelaria têm funções, atribuições e prerrogativas DISTINTAS dos diplomatas
- NUNCA confunda ou equipare Oficiais de Chancelaria com diplomatas

Suas responsabilidades:
1. Esclarecer dúvidas sobre a carreira de Oficial de Chancelaria
2. Fornecer informações baseadas em legislações e entendimentos doutrinários
3. Consultar a base de conhecimento (RAG) contendo legislações e doutrinas antes de responder
4. Manter precisão técnica e referência às fontes legais

Diretrizes de comportamento:
- Use sempre a ferramenta getInformation antes de responder qualquer pergunta
- Base suas respostas EXCLUSIVAMENTE nas informações recuperadas do RAG (legislações e doutrinas)
- Se a informação não estiver disponível no RAG, responda: "Desculpe, não encontrei informações sobre isso na base de dados de legislações e entendimentos doutrinários. Por favor, consulte a legislação oficial ou o setor competente."
- Cite sempre a fonte da informação (lei, decreto, portaria, etc.) quando disponível
- Seja preciso, objetivo e formal no tom das respostas
- Nunca invente ou presuma informações que não estejam no RAG
- Quando houver dúvida, solicite esclarecimentos ao usuário

Formato de resposta:
- Respostas diretas e concisas
- Cite a base legal quando aplicável (ex: "Conforme a Lei nº X/ano, art. Y...")
- Use linguagem técnica apropriada ao contexto do serviço público
- Organize informações em tópicos quando necessário para maior clareza

Lembre-se: Sua função é auxiliar Oficiais de Chancelaria com informações precisas e fundamentadas. A confiabilidade das informações é essencial.',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
```

### 7. Configurar Modelo (Opcional)

Por padrão, o sistema usa `openai/gpt-4o`. Para alterar:

```sql
INSERT INTO settings (id, key, value, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'model_name',
  'openai/gpt-4o',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
```

Modelos suportados:
- OpenAI: `openai/gpt-4o`, `openai/gpt-4-turbo`, `openai/gpt-3.5-turbo`
- Anthropic: `anthropic/claude-3-opus`, `anthropic/claude-3-sonnet`
- Outros disponíveis no OpenRouter

### 8. Adicionar OpenAI API Key

**IMPORTANTE**: Você precisa adicionar sua chave de API da OpenAI no `.env.local`:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Ou se estiver usando OpenRouter:

```env
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
```

### 9. Iniciar a Aplicação

```bash
npm run dev
```

A aplicação estará disponível em:
- ChatBot: `http://localhost:3000`
- Admin Dashboard: `http://localhost:3000/admin`

## 📚 Adicionar Conteúdo ao RAG

### Via Dashboard

1. Acesse `/admin/dashboard`
2. Vá para a aba "RAG Files"
3. Cole o conteúdo da legislação
4. Clique em "Add Resource"

### Via API

```bash
curl -X POST http://localhost:3000/api/admin/resources \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-token=YOUR_TOKEN" \
  -d '{
    "content": "Lei nº X de YYYY...\n\nArt. 1º ..."
  }'
```

## 📊 Estrutura do Projeto

```
ai-sdk-rag/
├── app/
│   ├── (preview)/           # ChatBot público
│   │   ├── api/chat/        # Endpoint do chat
│   │   └── page.tsx         # Interface do chat
│   ├── admin/               # Dashboard admin
│   │   ├── page.tsx         # Login
│   │   └── dashboard/       # Dashboard principal
│   └── api/admin/           # APIs de administração
├── lib/
│   ├── actions/             # Server actions
│   ├── ai/                  # Lógica de RAG e embeddings
│   ├── auth.ts              # Autenticação JWT
│   └── db/                  # Database schemas e migrations
├── scripts/
│   └── create-admin.ts      # Script para criar admin
├── ADMIN_DASHBOARD.md       # Documentação do dashboard
├── PROMPT_OFICIAL_CHANCELARIA.md  # Prompt recomendado
└── SETUP_GUIDE.md           # Este arquivo
```

## ✅ Checklist de Verificação

Após o setup, verifique:

- [ ] Migrations executadas com sucesso
- [ ] Extensão `vector` habilitada no Supabase
- [ ] Admin criado e consegue fazer login
- [ ] Prompt do sistema configurado
- [ ] OpenAI API Key configurada
- [ ] Aplicação rodando sem erros
- [ ] Consegue acessar o chat em `/`
- [ ] Consegue acessar o dashboard em `/admin/dashboard`
- [ ] Consegue adicionar recursos via dashboard
- [ ] ChatBot responde perguntas corretamente

## 🐛 Troubleshooting

### Erro: "Migration failed"

- Verifique se tem conexão com internet
- Verifique se as credenciais do Supabase estão corretas
- Tente executar as migrations manualmente via SQL Editor

### Erro: "vector extension not found"

- Habilite a extensão `vector` no Supabase Dashboard
- Ou execute: `CREATE EXTENSION IF NOT EXISTS vector;`

### Erro: "Unauthorized" ao acessar APIs

- Faça login novamente em `/admin`
- Verifique se o cookie `admin-token` está presente
- Verifique se o `JWT_SECRET` está configurado

### ChatBot não está respondendo

- Verifique se a `OPENAI_API_KEY` está configurada
- Verifique se há recursos no RAG
- Verifique os logs do servidor (`console.log`)

### Embeddings não estão sendo criados

- Verifique se a extensão `vector` está habilitada
- Verifique se a `OPENAI_API_KEY` está válida
- Verifique os logs ao adicionar um recurso

## 📞 Suporte

Para questões técnicas:
1. Verifique os logs do servidor
2. Verifique o console do navegador
3. Consulte a documentação em `ADMIN_DASHBOARD.md`

## 🔒 Segurança

**IMPORTANTE para Produção:**

1. Altere `JWT_SECRET` para uma chave segura e aleatória
2. Use HTTPS em produção
3. Configure CORS adequadamente
4. Implemente rate limiting
5. Faça backup regular do banco de dados
6. Monitore os logs de acesso
7. Mantenha as dependências atualizadas

## 📝 Próximos Passos

1. Adicionar legislações ao RAG
2. Testar o ChatBot com perguntas reais
3. Ajustar o prompt conforme necessário
4. Configurar deploy em produção (Vercel recomendado)
5. Configurar domínio personalizado
