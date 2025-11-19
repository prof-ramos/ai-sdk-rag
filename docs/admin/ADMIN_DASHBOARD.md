# ChatBot Admin Dashboard

Dashboard de administração completo para gerenciar o ChatBot com RAG.

## Funcionalidades

O dashboard permite que o administrador:

1. **Gerenciar Prompt do Sistema** - Alterar o comportamento e personalidade do ChatBot
2. **Gerenciar Arquivos RAG** - Adicionar e remover documentos da base de conhecimento
3. **Visualizar Arquivos RAG** - Ver todos os arquivos indexados e quantidade de embeddings
4. **Logs de Conversas** - Ver histórico de perguntas e respostas de todos os usuários
5. **Exportar Logs** - Baixar logs em formato CSV
6. **Configurar Modelo** - Escolher qual modelo da OpenRouter/OpenAI utilizar

## Setup Inicial

### 1. Executar Migrations

Primeiro, execute as migrations do banco de dados:

```bash
npm run db:migrate
```

### 2. Criar Admin

Crie o primeiro usuário administrador:

```bash
npm run create-admin <username> <password>
```

Exemplo:
```bash
npm run create-admin admin mySecurePassword123
```

### 3. Configurar Variáveis de Ambiente

Adicione ao seu `.env.local`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
JWT_SECRET=your-super-secret-jwt-key-here
```

**IMPORTANTE**: Altere `JWT_SECRET` para uma chave secreta forte em produção!

### 4. Iniciar Aplicação

```bash
npm run dev
```

## Acessando o Dashboard

1. Acesse: `http://localhost:3000/admin`
2. Faça login com as credenciais criadas no passo 2
3. Você será redirecionado para: `http://localhost:3000/admin/dashboard`

## Estrutura do Dashboard

### Aba 1: System Prompt
- Editor de texto para configurar o prompt do sistema
- O prompt define como o ChatBot se comporta e responde
- Alterações são aplicadas imediatamente em novas conversas

### Aba 2: RAG Files
- **Adicionar Recursos**: Cole texto ou conteúdo de documentos
- **Listar Recursos**: Veja todos os documentos na base de conhecimento
- **Deletar Recursos**: Remova documentos (embeddings são deletados automaticamente)
- Cada recurso mostra:
  - Conteúdo (prévia)
  - Quantidade de embeddings gerados
  - Data de criação

### Aba 3: Chat Logs
- Visualize todas as conversas
- Informações mostradas:
  - ID do usuário (IP ou "anonymous")
  - Pergunta feita
  - Resposta do ChatBot
  - Modelo utilizado
  - Data e hora
- **Botão Export CSV**: Baixa todos os logs em formato CSV

### Aba 4: Settings
- Configurar qual modelo utilizar
- Suporta:
  - OpenAI: `openai/gpt-4o`, `openai/gpt-4-turbo`, etc.
  - Anthropic: `anthropic/claude-3-opus`, `anthropic/claude-3-sonnet`
  - Outros modelos do OpenRouter

## API Endpoints

O dashboard utiliza os seguintes endpoints:

### Autenticação
- `POST /api/admin/login` - Login
- `POST /api/admin/logout` - Logout
- `GET /api/admin/session` - Verificar sessão

### Settings
- `GET /api/admin/settings` - Buscar configurações
- `PUT /api/admin/settings` - Atualizar configuração

### Resources (RAG)
- `GET /api/admin/resources` - Listar recursos
- `POST /api/admin/resources` - Adicionar recurso
- `DELETE /api/admin/resources/:id` - Deletar recurso

### Logs
- `GET /api/admin/logs` - Listar logs (query param: `?limit=100`)
- `GET /api/admin/logs/export` - Exportar CSV

## Banco de Dados

### Tabelas Adicionadas

1. **admins** - Usuários administradores
   - id, username, password (hash), createdAt, updatedAt

2. **settings** - Configurações do sistema
   - id, key, value, createdAt, updatedAt
   - Keys utilizadas:
     - `system_prompt`: Prompt do sistema
     - `model_name`: Nome do modelo

3. **chat_logs** - Logs de conversas
   - id, userId, question, answer, context, model, createdAt

## Segurança

- Autenticação via JWT
- Passwords com hash bcrypt (10 rounds)
- Cookies httpOnly
- Todas as rotas `/api/admin/*` requerem autenticação (exceto login)
- Middleware `requireAdmin()` valida sessão

## Próximos Passos (Opcional)

- [ ] Adicionar paginação aos logs
- [ ] Filtros de busca nos logs (por data, usuário, etc)
- [ ] Upload de arquivos PDF/TXT para RAG
- [ ] Dashboard analytics (métricas, gráficos)
- [ ] Rate limiting nas APIs
- [ ] Múltiplos níveis de acesso (admin, moderador, etc)
- [ ] Backup automático do banco de dados

## Suporte

Para problemas ou dúvidas, verifique:
1. Logs do servidor (`console.log` nos endpoints)
2. Console do navegador (erros de frontend)
3. Conexão com o banco de dados
4. Variáveis de ambiente configuradas corretamente
